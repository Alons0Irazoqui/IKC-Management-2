import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Student, TuitionRecord, AcademySettings } from '../types';
import { useToast } from './ToastContext';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    currentUser: UserProfile | null;
    login: (email: string, pass: string) => Promise<boolean>;
    registerStudent: (data: any) => Promise<boolean>;
    registerMaster: (data: any) => Promise<boolean>;
    logout: () => void;
    updateUserProfile: (profile: Partial<UserProfile>) => void;
    changePassword: (newPassword: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session.user.id);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setCurrentUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string, retryCount = 0) => {
        try {
            console.log(`[Auth] Fetching profile for ${userId} (Attempt ${retryCount + 1})`);

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error || !data) {
                console.warn('[Auth] Profile not found or error:', error);

                // Retry Logic (Recurse)
                if (retryCount < 3) {
                    setTimeout(() => fetchProfile(userId, retryCount + 1), 500);
                    return;
                }

                // Self-Healing Logic (After 3 attempts)
                console.log('[Auth] Attempting Self-Healing for Profile...');
                const { data: { user } } = await supabase.auth.getUser();
                if (user && user.user_metadata) {
                    const meta = user.user_metadata;
                    const academyId = meta.academy_id || 'acad-1'; // Fallback

                    // Manual Insert as last resort
                    const { error: insertError } = await supabase.from('profiles').insert({
                        id: userId,
                        email: user.email,
                        role: meta.role || 'student', // Default safe
                        full_name: meta.full_name || 'Usuario',
                        academy_id: academyId
                    });

                    if (!insertError) {
                        console.log('[Auth] Self-Healing Successful. Refetching...');
                        return fetchProfile(userId, 0); // Restart fetch
                    } else {
                        console.error('[Auth] Self-Healing Failed:', insertError);
                    }
                }
                return;
            }

            console.log('[Auth] Profile loaded:', data.role);

            const profile: UserProfile = {
                id: data.id,
                email: data.email,
                role: data.role as 'master' | 'student',
                name: data.full_name || '',
                avatarUrl: data.avatar_url || '',
                academyId: data.academy_id || 'acad-1',
            };

            // Fetch Student Details if applicable
            if (profile.role === 'student') {
                const { data: studentData } = await supabase
                    .from('students')
                    .select('id')
                    .eq('user_id', userId)
                    .single();
                if (studentData) {
                    profile.studentId = studentData.id;
                }
            }

            setCurrentUser(profile);

            // Persistence for Legacy Login Check
            localStorage.setItem('pulse_current_session', JSON.stringify(profile));

        } catch (err) {
            console.error('[Auth] Critical Error in fetchProfile:', err);
        }
    };

    const login = async (email: string, pass: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: pass,
            });

            if (error) throw error;

            if (data.user) {
                await fetchProfile(data.user.id);
                addToast('Bienvenido de nuevo', 'success');
                return true;
            }
            return false;
        } catch (error) {
            addToast(error instanceof Error ? error.message : "Error al iniciar sesión", 'error');
            return false;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setCurrentUser(null);
        localStorage.removeItem('pulse_current_session');
        addToast('Sesión cerrada correctamente', 'info');
    };

    const updateUserProfile = async (updates: Partial<UserProfile>) => {
        if (!currentUser) return;

        try {
            const dbUpdates: any = {};
            if (updates.name) dbUpdates.full_name = updates.name;
            if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
            if (updates.email) dbUpdates.email = updates.email;

            const { error } = await supabase
                .from('profiles')
                .update(dbUpdates)
                .eq('id', currentUser.id);

            if (error) throw error;

            setCurrentUser({ ...currentUser, ...updates });
            addToast('Perfil actualizado', 'success');
        } catch (err) {
            addToast('Error al actualizar perfil', 'error');
        }
    };

    const changePassword = async (newPassword: string) => {
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            addToast('Contraseña actualizada', 'success');
        } catch (err) {
            addToast('Error al actualizar contraseña', 'error');
        }
    };

    const registerStudent = async (data: any) => {
        try {
            // 1. Verify Academy Code
            const { data: mAcademy, error: acadError } = await supabase
                .from('academies')
                .select('id, payment_settings, ranks')
                .or(`code.eq.${data.academyCode},id.eq.${data.academyCode}`)
                .single();

            if (acadError || !mAcademy) throw new Error("Código de academia inválido.");

            // 2. SignUp Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.name,
                        role: 'student',
                        academy_id: mAcademy.id
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("No se pudo crear el usuario.");

            // Check if session exists (Email Confirmation might be required)
            if (!authData.session) {
                addToast('Cuenta creada. Verifica tu email para completar tu perfil estudiantil la primera vez que entres.', 'info');
                return true;
            }

            const userId = authData.user.id;

            // 3. Create Profile (REMOVED - Handled by Database Trigger)

            // 4. Create Student Record
            const initialAmount = Number(mAcademy.payment_settings?.monthlyTuition) || 0;

            const studentInsert = {
                user_id: userId,
                academy_id: mAcademy.id,
                name: data.name,
                email: data.email,
                cell_phone: data.cellPhone,
                age: data.age,
                birth_date: data.birthDate,
                rank: 'White Belt',
                rank_id: mAcademy.ranks?.[0]?.id || 'rank-1',
                rank_color: 'white',
                stripes: 0,
                status: initialAmount > 0 ? 'debtor' : 'active',
                program: 'Adults',
                attendance: 0,
                total_attendance: 0,
                join_date: new Date().toISOString(),
                balance: initialAmount,
                guardian: {
                    fullName: data.guardianName,
                    email: data.guardianEmail,
                    relationship: data.guardianRelationship,
                    phones: {
                        main: data.guardianMainPhone,
                        secondary: data.guardianSecondaryPhone
                    },
                    address: {
                        street: data.street,
                        exteriorNumber: data.exteriorNumber,
                        colony: data.colony,
                        zipCode: data.zipCode
                    }
                },
                avatar_url: data.avatarUrl || ''
            };

            const { data: studentDB, error: studentError } = await supabase
                .from('students')
                .insert(studentInsert)
                .select()
                .single();

            if (studentError) throw studentError;

            // 5. Initial Charge Logic
            if (initialAmount > 0 && studentDB) {
                const today = new Date();
                const monthName = today.toLocaleString('es-ES', { month: 'long' });
                const concept = `Mensualidad ${monthName}`;
                const lateFeeDay = mAcademy.payment_settings?.lateFeeDay || 10;
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(lateFeeDay).padStart(2, '0');
                const dueDate = `${year}-${month}-${day}`;

                await supabase.from('financial_records').insert({
                    academy_id: mAcademy.id,
                    student_id: studentDB.id,
                    concept: concept,
                    amount: initialAmount,
                    penalty_amount: 0,
                    due_date: dueDate,
                    status: 'pending',
                    method: 'System'
                });
            }

            addToast('Cuenta de alumno creada exitosamente', 'success');
            // Fetch profile to update state if auto-login happens (Supabase auto-logs in usually)
            fetchProfile(userId);
            return true;
        } catch (error) {
            addToast(error instanceof Error ? error.message : "Error al registrar", 'error');
            return false;
        }
    };

    const registerMaster = async (data: any) => {
        try {
            // 1. SignUp with Metadata (Trigger handles Profile & Academy creation)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.name,
                        role: 'master',
                        academy_name: data.academyName
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("No se pudo crear el usuario.");

            addToast('Registro iniciado. Por favor verifica tu correo.', 'success');
            // Do NOT fetch profile immediately as session might be null if email confirm is required
            // if (authData.session) fetchProfile(authData.user.id); 
            return true;
        } catch (error) {
            addToast(error instanceof Error ? error.message : "Error al registrar", 'error');
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            login,
            logout,
            registerStudent,
            registerMaster,
            updateUserProfile,
            changePassword
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};