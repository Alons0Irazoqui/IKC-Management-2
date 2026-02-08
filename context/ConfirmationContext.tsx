import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';

interface ConfirmationOptions {
    title: string;
    message: string;
    type?: 'danger' | 'info' | 'success';
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
}

interface ConfirmationContextType {
    confirm: (options: ConfirmationOptions) => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [modalConfig, setModalConfig] = useState<ConfirmationOptions | null>(null);

    const confirm = useCallback((options: ConfirmationOptions) => {
        setModalConfig(options);
    }, []);

    const handleConfirm = () => {
        if (modalConfig) {
            modalConfig.onConfirm();
            setModalConfig(null);
        }
    };

    const handleCancel = () => {
        setModalConfig(null);
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            {modalConfig && (
                <ConfirmationModal
                    isOpen={true}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    type={modalConfig.type}
                    confirmText={modalConfig.confirmText}
                    cancelText={modalConfig.cancelText}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ConfirmationContext.Provider>
    );
};

export const useConfirmation = () => {
    const context = useContext(ConfirmationContext);
    if (!context) throw new Error('useConfirmation must be used within ConfirmationProvider');
    return context;
};