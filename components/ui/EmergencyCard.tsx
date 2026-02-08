
import React from 'react';
import { Student } from '../../types';

interface EmergencyCardProps {
  student: Student;
}

const EmergencyCard: React.FC<EmergencyCardProps> = ({ student }) => {
  const { guardian } = student;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-text-main flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500">emergency_home</span>
          Información de Emergencia
        </h3>
        <span className="text-xs font-bold uppercase tracking-wider bg-white border border-gray-200 px-2 py-1 rounded text-text-secondary">
          {guardian.relationship}
        </span>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Contacto Principal */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Datos del Responsable</h4>
          
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div>
              <p className="font-bold text-text-main">{guardian.fullName}</p>
              <p className="text-sm text-text-secondary">{guardian.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="size-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">phone_iphone</span>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-text-main text-sm">Principal: {guardian.phones.main}</p>
              {guardian.phones.secondary && (
                <p className="text-xs text-text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">call</span> {guardian.phones.secondary}
                </p>
              )}
              {guardian.phones.tertiary && (
                <p className="text-xs text-text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">call</span> {guardian.phones.tertiary}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Domicilio Registrado</h4>
          
          <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="mt-1">
               <span className="material-symbols-outlined text-gray-400">location_on</span>
            </div>
            <div className="text-sm">
              <p className="font-bold text-text-main">
                {guardian.address.street} {guardian.address.exteriorNumber}
                {guardian.address.interiorNumber ? ` Int. ${guardian.address.interiorNumber}` : ''}
              </p>
              <p className="text-text-secondary">Col. {guardian.address.colony}</p>
              <p className="text-text-secondary">
                CP: {guardian.address.zipCode} 
                {guardian.address.city ? `, ${guardian.address.city}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyCard;
