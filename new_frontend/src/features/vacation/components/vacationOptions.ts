import type { VacationStatus, VacationType } from "@/types/vacation";

export const vacationTypeOptions: { label: string; value: VacationType }[] = [
    { label: "Ежегодный отпуск", value: "ANNUAL_LEAVE" },
    { label: "Больничный", value: "SICK_LEAVE" },
    { label: "Командировка", value: "BUSINESS_TRIP" },
];

export const vacationStatusOptions: { label: string; value: VacationStatus }[] = [
    { label: "Активный", value: "ACTIVE" },
    { label: "Отменен", value: "CANCELLED" },
];

export const getVacationTypeLabel = (value: VacationType) =>
    vacationTypeOptions.find(option => option.value === value)?.label ?? value;

export const getVacationStatusLabel = (value: VacationStatus) =>
    vacationStatusOptions.find(option => option.value === value)?.label ?? value;
