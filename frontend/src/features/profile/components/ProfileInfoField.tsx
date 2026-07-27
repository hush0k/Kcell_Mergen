interface Props {
    label: string;
    value: string;
}

export function ProfileInfoField({ label, value }: Props) {
    return (
        <div className="flex flex-col space-y-1">
            <span className="text-xs text-mg-text-3 font-bold uppercase">{label}</span>
            <span className="text-sm text-mg-text font-medium">{value}</span>
        </div>
    );
}