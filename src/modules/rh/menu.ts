import { 
  Users, 
  Briefcase, 
  Calendar, 
  Clock, 
  FileCheck, 
  BadgeCheck, 
  FileText, 
  Shield, 
  FileStack, 
  DoorOpen, 
  BarChart, 
  Inbox, 
  Smartphone,
  Home,
  UserPlus
} from 'lucide-react';
import { RhMenuItem } from './types';

export function getRhMenuItems(): RhMenuItem[] {
  return [
    {
      id: 'rh-dashboard',
      label: 'Dashboard',
      path: '/rh',
      icon: 'Home'
    },
    {
      id: 'rh-pessoas',
      label: 'Pessoas',
      path: '/rh/pessoas',
      icon: 'Users'
    },
    {
      id: 'rh-rs',
      label: 'R&S',
      icon: 'Briefcase',
      children: [
        {
          id: 'rh-vagas',
          label: 'Vagas',
          path: '/rh/vagas',
          icon: 'Briefcase'
        },
        {
          id: 'rh-candidatos',
          label: 'Candidatos',
          path: '/rh/candidatos',
          icon: 'Users'
        },
        {
          id: 'rh-admissoes',
          label: 'Admissões',
          path: '/rh/admissoes',
          icon: 'UserPlus'
        }
      ]
    },
    {
      id: 'rh-jornada-ponto',
      label: 'Jornada & Ponto',
      icon: 'Clock',
      children: [
        {
          id: 'rh-ponto',
          label: 'Ponto',
          path: '/rh/ponto',
          icon: 'Clock'
        },
        {
          id: 'rh-banco-horas',
          label: 'Banco de Horas',
          path: '/rh/banco-horas',
          icon: 'Clock'
        }
      ]
    },
    {
      id: 'rh-ferias-ausencias',
      label: 'Férias & Ausências',
      icon: 'Calendar',
      children: [
        {
          id: 'rh-ferias',
          label: 'Férias',
          path: '/rh/ferias',
          icon: 'Calendar'
        },
        {
          id: 'rh-ausencias',
          label: 'Ausências',
          path: '/rh/ausencias',
          icon: 'Calendar'
        }
      ]
    },
    {
      id: 'rh-holerites',
      label: 'Remuneração & Holerites',
      path: '/rh/holerites',
      icon: 'FileText'
    },
    {
      id: 'rh-beneficios',
      label: 'Benefícios',
      path: '/rh/beneficios',
      icon: 'BadgeCheck'
    },
    {
      id: 'rh-ssma',
      label: 'SSMA',
      path: '/rh/ssma',
      icon: 'Shield'
    },
    {
      id: 'rh-documentos',
      label: 'Documentos & Checklists',
      path: '/rh/documentos',
      icon: 'FileStack'
    },
    {
      id: 'rh-offboarding',
      label: 'Offboarding',
      path: '/rh/offboarding',
      icon: 'DoorOpen'
    },
    {
      id: 'rh-relatorios',
      label: 'Relatórios',
      icon: 'BarChart',
      children: [
        {
          id: 'rh-relatorio-executivo',
          label: 'Executivo',
          path: '/rh/relatorios/executivo',
          icon: 'BarChart'
        },
        {
          id: 'rh-relatorio-rs',
          label: 'R&S',
          path: '/rh/relatorios/rs',
          icon: 'BarChart'
        },
        {
          id: 'rh-relatorio-jornada',
          label: 'Jornada',
          path: '/rh/relatorios/jornada',
          icon: 'BarChart'
        },
        {
          id: 'rh-relatorio-compliance',
          label: 'Compliance',
          path: '/rh/relatorios/compliance',
          icon: 'BarChart'
        },
        {
          id: 'rh-relatorio-financeiro',
          label: 'Financeiro',
          path: '/rh/relatorios/financeiro',
          icon: 'BarChart'
        }
      ]
    },
    {
      id: 'rh-aprovacoes',
      label: 'Aprovações',
      path: '/rh/aprovacoes',
      icon: 'Inbox'
    },
    {
      id: 'rh-portal',
      label: 'Portal do Colaborador',
      path: '/rh/portal',
      icon: 'Smartphone'
    }
  ];
}