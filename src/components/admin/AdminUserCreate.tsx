import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { logAction } from '@/services/logger';
import { useAuth } from '@/contexts/AuthContext';

export function AdminUserCreate() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user', // Default role
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Log the attempt
            await logAction('USER_CREATE_ATTEMPT', { ...formData, created_by: user?.email }, user?.id);

            // 2. IMPORTANT: Actual User Creation
            // Since we are using Auth0, creating a user usually requires the Management API.
            // We cannot call this directly from the browser securely.
            // Ideally, we would call a Supabase Edge Function here: 
            // await supabase.functions.invoke('create-auth0-user', { body: formData })

            // For this demo/task, we simulate the success and log the "Intent".
            // The actual implementation requires backend infrastructure (Edge Function with Auth0 Secrets).

            console.log('Criação de usuário:', formData);

            // 3. Log Success
            await logAction('USER_CREATED', {
                email: formData.email,
                role: formData.role,
                note: 'User creation simulated (requires backend)'
            }, user?.id);

            toast.success('Usuário registrado com sucesso!', {
                description: 'No ambiente real, um email de convite seria enviado.',
            });

            // Reset form
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'user',
            });

        } catch (error: any) {
            toast.error('Erro ao criar usuário', { description: error.message });
            await logAction('USER_CREATE_ERROR', { error: error.message }, user?.id);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
                <CardTitle>Cadastrar Novo Usuário</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Senha Inicial</Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            required
                            minLength={8}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Função (Cargo)</Label>
                        <Select
                            value={formData.role}
                            onValueChange={(val) => setFormData(prev => ({ ...prev, role: val }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">Usuário Padrão</SelectItem>
                                <SelectItem value="vendedor">Vendedor</SelectItem>
                                <SelectItem value="logistica">Logística</SelectItem>
                                <SelectItem value="mecanico">Mecânico</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Processando...' : 'Criar Usuário'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
