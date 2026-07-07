import type { IsoDateTime, UserBrief } from "@/types/api";

export type VacationType = "ANNUAL_LEAVE" | "SICK_LEAVE" | "BUSINESS_TRIP";
export type VacationStatus = "ACTIVE" | "CANCELLED";

export interface VacationScheduleResponse {
    id: number;
    user_id: number;
    start_date: string;
    end_date: string;
    vacation_type: VacationType;
    status: VacationStatus;
    created_at: IsoDateTime;
    updated_at: IsoDateTime;
}

export interface VacationScheduleWithUser extends VacationScheduleResponse {
    user: UserBrief | null;
}

export interface VacationScheduleList {
    vacations: VacationScheduleWithUser[];
    offset: number;
    limit: number;
    total: number;
}

export interface VacationScheduleCreate {
    user_id: number;
    start_date: string;
    end_date: string;
    vacation_type?: VacationType;
    status?: VacationStatus;
}

export type VacationScheduleUpdate = Partial<VacationScheduleCreate>;
