import { z } from 'zod';

export const financeTransactionSchema = z.object({
  studentId: z.string().min(1, "Debes seleccionar un alumno"),
  type: z.enum(['charge', 'payment']),
  amount: z.coerce.number({ message: "Ingresa un número válido" })
    .positive("El monto debe ser mayor a 0")
    .min(0.01, "El monto mínimo es 0.01"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Ingresa una fecha válida",
  }),
  category: z.enum(['Mensualidad', 'Torneo', 'Examen/Promoción', 'Equipo/Uniforme', 'Otro', 'Late Fee'], {
    message: "Selecciona una categoría válida",
  }),
  concept: z.string().min(3, "La descripción debe tener al menos 3 caracteres"),
  method: z.enum(['Efectivo', 'Transferencia', 'Tarjeta', 'System']).optional(),
}).superRefine((data, ctx) => {
  // Conditional validation: Payment method is required only for payments
  if (data.type === 'payment' && !data.method) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selecciona un método de pago",
      path: ["method"],
    });
  }
});

export type FinanceTransactionForm = z.infer<typeof financeTransactionSchema>;