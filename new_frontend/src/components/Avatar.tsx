interface Props {
    firstName?: string | null;
    lastName?: string | null;
}

export function Avatar({ firstName, lastName }: Props) {
    function getInitials(firstName?: string, lastName?: string) {
        if (!firstName || !lastName) return "?";
        return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }

    return (
        <div className="mg-avatar">
            {firstName && lastName ? getInitials(firstName, lastName) : "..."}
        </div>
    )
}