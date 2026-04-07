import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertTriangle } from 'lucide-react';

export default function SSMA() {
  const [selectedTab, setSelectedTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">SSMA</h1>
          <p className="text-muted-foreground">Segurança, Saúde e Meio Ambiente</p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="aso">ASO</TabsTrigger>
          <TabsTrigger value="treinamentos">NRs/Treinamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum registro de SSMA</h3>
                <p className="text-muted-foreground">Cadastre exames ASO e treinamentos NR para acompanhar a conformidade</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aso">
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum exame ASO registrado</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treinamentos">
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum treinamento NR registrado</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
