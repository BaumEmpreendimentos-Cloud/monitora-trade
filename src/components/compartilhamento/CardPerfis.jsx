import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

export default function CardPerfis({ perfis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Eye className="w-4 h-4" /> Operações compartilhadas comigo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Perfis que autorizaram você a acompanhar as operações deles.
        </p>
        <div className="divide-y divide-border border rounded-lg overflow-hidden">
          {perfis.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum usuário autorizou você ainda.</p>
          ) : perfis.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.titular_nome || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground">
                  {p.data_autorizacao ? `Autorizado em ${new Date(p.data_autorizacao).toLocaleDateString('pt-BR')}` : 'Autorizado'}
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link to={`/perfil/${p.titular_id}`}><Eye className="w-4 h-4 mr-1" /> Ver operações</Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}