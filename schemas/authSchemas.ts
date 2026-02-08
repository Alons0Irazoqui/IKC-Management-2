
import { z } from 'zod';

const phoneRegex = /^\d{10,}$/;

export const studentRegistrationSchema = z.object({
  // Auth & Link
  academyCode: z.string().min(4, "El código de academia es obligatorio"),
  
  // Student Personal Data
  name: z.string().min(3, "El nombre completo del alumno es obligatorio"),
  age: z.coerce.number().min(3, "Edad mínima 3 años").max(100, "Edad no válida"),
  birthDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Fecha de nacimiento inválida" }),
  email: z.string().email("Ingresa un correo electrónico válido para el alumno"),
  cellPhone: z.string().regex(phoneRegex, "El celular debe tener al menos 10 dígitos"),
  avatarUrl: z.string().optional(),
  
  // Physical Data
  weight: z.coerce.number().min(5, "Mínimo 5kg").max(300, "Máximo 300kg").optional(),
  height: z.coerce.number().min(40, "Mínimo 40cm").max(250, "Máximo 250cm").optional(),
  bloodType: z.string().optional(), // Added bloodType
  
  // Guardian Data
  guardianName: z.string().min(3, "El nombre del tutor es obligatorio"),
  guardianEmail: z.string().email("Correo del tutor inválido"),
  guardianRelationship: z.enum(['Padre', 'Madre', 'Tutor Legal', 'Familiar', 'Otro'], {
    errorMap: () => ({ message: "Selecciona un parentesco válido" })
  }),
  
  // Guardian Phones
  guardianMainPhone: z.string().regex(phoneRegex, "El teléfono principal debe tener 10 dígitos"),
  guardianSecondaryPhone: z.string().regex(phoneRegex, "Formato inválido").optional().or(z.literal('')),
  guardianTertiaryPhone: z.string().regex(phoneRegex, "Formato inválido").optional().or(z.literal('')),
  
  // Guardian Address
  street: z.string().min(3, "Calle requerida"),
  exteriorNumber: z.string().min(1, "No. Ext requerido"),
  interiorNumber: z.string().optional(),
  colony: z.string().min(3, "Colonia requerida"),
  zipCode: z.string().length(5, "El CP debe ser de 5 dígitos"),

  // Security
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export const masterRegistrationSchema = z.object({
  name: z.string().min(3, "El nombre del maestro es obligatorio"),
  email: z.string().email("Ingresa un correo electrónico válido"),
  academyName: z.string().min(3, "El nombre de la academia es obligatorio"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
  termsAccepted: z.literal(true, {
    message: "Debes aceptar los términos y condiciones",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type StudentRegistrationForm = z.infer<typeof studentRegistrationSchema>;
export type MasterRegistrationForm = z.infer<typeof masterRegistrationSchema>;