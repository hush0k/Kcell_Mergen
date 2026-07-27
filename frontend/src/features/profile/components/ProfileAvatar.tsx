function getInitials(firstName?: string, lastName?: string) {
    if (!firstName || !lastName) return "?";
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

interface Props {
    firstName?: string;
    lastName?: string;
    size?: "sm" | "lg";
}

export function ProfileAvatar({ firstName, lastName, size = "sm" }: Props) {
    return (
        <div className={size === "lg" ? "mg-avatar w-20 h-20 text-2xl" : "mg-avatar"}>
            {getInitials(firstName, lastName)}
        </div>
    );
}