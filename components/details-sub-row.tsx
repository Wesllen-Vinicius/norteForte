import { Badge } from "./ui/badge";

interface Detail {
    label: string;
    value: React.ReactNode;
    isBadge?: boolean;
    className?: string;
}

interface DetailsSubRowProps {
    details: Detail[];
}

export const DetailsSubRow = ({ details }: DetailsSubRowProps) => {
    return (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-muted/20">
            {details.map((detail, index) => (
                <div key={index} className={`space-y-1 p-3 bg-background rounded-md border ${detail.className}`}>
                    <p className="text-xs font-semibold text-muted-foreground">{detail.label}</p>
                    {detail.isBadge ? (
                        <Badge variant="outline" className="capitalize">{detail.value}</Badge>
                    ) : (
                        <p className="text-sm break-words">{detail.value || 'N/A'}</p>
                    )}
                </div>
            ))}
        </div>
    );
};
