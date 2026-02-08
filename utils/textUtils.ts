
import { StudentStatus } from '../types';

export const getStatusLabel = (status: StudentStatus): string => {
    switch (status) {
        case 'active': return 'Activo';
        case 'inactive': return 'Inactivo';
        case 'debtor': return 'Adeudo';
        case 'exam_ready': return 'Examen listo';
        default: return 'Desconocido';
    }
};
