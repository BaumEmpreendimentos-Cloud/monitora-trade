import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LineChart, ArrowLeft } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function PrivacyPolicy() {
  const sections = [
    {
      title: '1. Informações que coletamos',
      body: [
        'Coletamos as seguintes informações pessoais quando você se cadastra no Monitora Trade:',
        '• Nome completo e endereço de e-mail;',
        '• CPF (necessário para a apuração de impostos e controle de trial);',
        '• Dados de operações financeiras que você registra no app (ativos, quantidades, preços, datas);',
        '• Informações de pagamento processadas via Stripe (não armazenamos dados de cartão em nossos servidores).',
      ],
    },
    {
      title: '2. Como utilizamos suas informações',
      body: [
        'Utilizamos seus dados para:',
        '• Prestar os serviços de controle de operações e apuração de IRPF;',
        '• Buscar cotações em tempo real via API do OpLab, utilizando o token de acesso do app;',
        '• Enviar notificações push, e-mail e mensagens in-app sobre suas operações e alertas;',
        '• Processar pagamentos de assinatura Premium via Stripe;',
        '• Cumprir obrigações legais e regulatórias.',
      ],
    },
    {
      title: '3. Compartilhamento de dados',
      body: [
        'Seus dados são compartilhados apenas com os seguintes prestadores de serviços:',
        '• Stripe — processamento de pagamentos da assinatura Premium;',
        '• OpLab — fornecimento de cotações e dados de mercado da B3;',
        '• Google e Apple — serviços de notificações push e distribuição do app.',
        'Não vendemos nem compartilhamos seus dados pessoais com terceiros para fins de marketing.',
      ],
    },
    {
      title: '4. Segurança',
      body: [
        'Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo isolamento por usuário (Row-Level Security) e criptografia em trânsito. No entanto, nenhum sistema é 100% seguro e não podemos garantir segurança absoluta.',
      ],
    },
    {
      title: '5. Retenção de dados',
      body: [
        'Seus dados são mantidos enquanto sua conta estiver ativa. Você pode solicitar a exclusão da sua conta a qualquer momento nas Configurações do app, o que removerá permanentemente todos os seus dados de operações e informações associadas.',
      ],
    },
    {
      title: '6. Seus direitos (LGPD)',
      body: [
        'Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:',
        '• Acessar os dados que temos sobre você;',
        '• Corrigir dados incompletos ou inexatos;',
        '• Solicitar a exclusão dos seus dados;',
        '• Revogar consentimento para tratamentos específicos.',
        'Para exercer esses direitos, entre em contato através do suporte do app.',
      ],
    },
    {
      title: '7. Crianças e adolescentes',
      body: [
        'O Monitora Trade não é direcionado a menores de 18 anos e não coletamos intencionalmente dados de menores.',
      ],
    },
    {
      title: '8. Alterações desta política',
      body: [
        'Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas através do app ou por e-mail. A data de atualização abaixo indica a última revisão.',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-background">
      <header className="border-b bg-card sticky top-0 z-10 pt-safe">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-heading font-bold">
            <LineChart className="w-5 h-5 text-primary" /> Monitora Trade
          </Link>
          <nav className="flex gap-2 items-center">
            <ThemeToggle />
            <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /> Voltar</Button></Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 md:py-16">
        <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 15 de agosto de 2026</p>

        <div className="rounded-xl border bg-card p-6 md:p-8 space-y-6">
          <p className="text-sm text-muted-foreground">
            Esta Política de Privacidade descreve como o Monitora Trade coleta, utiliza, compartilha e protege
            suas informações pessoais quando você utiliza nosso aplicativo e serviços relacionados.
          </p>

          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="font-semibold text-base mb-2">{s.title}</h2>
              <div className="text-sm text-muted-foreground space-y-1">
                {s.body.map((p, i) => (
                  <p key={i} className={p.startsWith('•') ? 'pl-2' : ''}>{p}</p>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Ao utilizar o Monitora Trade, você concorda com os termos desta Política de Privacidade.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Monitora Trade · Controle de operações financeiras
      </footer>
    </div>
  );
}