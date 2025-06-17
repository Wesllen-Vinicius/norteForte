import { CenteredLayout } from "@/components/centered-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SettingsPage() {
    return (
        <CenteredLayout>
            <Card>
                <CardHeader>
                    <CardTitle>Configurações</CardTitle>
                    <CardDescription>
                        Ajustes e preferências gerais da aplicação.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Esta página está em construção.
                    </p>
                </CardContent>
            </Card>
        </CenteredLayout>
    );
}
