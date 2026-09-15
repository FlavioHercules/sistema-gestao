import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  School,
  UserCheck,
  BookOpen,
  Users,
  Link2,
  CalendarDays,
  BellRing,
  Shield,
  ClipboardList,
  Layers,
  Package,
} from "lucide-react";

export interface NavItem {
  section?: string;
  to: string;
  label: string;
  icon: LucideIcon;
}

export const professorNavItems: NavItem[] = [
  {
    section: "Principal",
    to: "/professor",
    label: "Dashboard",
    icon: School,
  },
  {
    section: "Gestão",
    to: "/professor/turmas",
    label: "Minhas turmas",
    icon: GraduationCap,
  },
  {
    section: "Gestão",
    to: "/professor/notas",
    label: "Notas",
    icon: ClipboardList,
  },
  {
    section: "Gestão",
    to: "/professor/boletim",
    label: "Boletins",
    icon: BookOpen,
  },
  {
    section: "Gestão",
    to: "/professor/atividades",
    label: "Atividades",
    icon: Layers,
  },
  {
    section: "Serviços",
    to: "/professor/reservas",
    label: "Reservas de Espaços",
    icon: CalendarDays,
  },
  {
    section: "Serviços",
    to: "/professor/equipamentos",
    label: "Reservas de Equipamentos",
    icon: Package,
  },
];

export const coordenacaoNavItems: NavItem[] = [
  {
    section: "Principal",
    to: "/coordenacao",
    label: "Dashboard",
    icon: GraduationCap,
  },
  {
    section: "Gestão acadêmica",
    to: "/coordenacao/professores",
    label: "Professores",
    icon: UserCheck,
  },
  {
    section: "Gestão acadêmica",
    to: "/coordenacao/disciplinas",
    label: "Disciplinas",
    icon: BookOpen,
  },
  {
    section: "Gestão acadêmica",
    to: "/coordenacao/turmas",
    label: "Turmas",
    icon: Users,
  },
  {
    section: "Gestão acadêmica",
    to: "/coordenacao/associacoes",
    label: "Atribuir Disciplinas",
    icon: Link2,
  },
  {
    section: "Operações",
    to: "/coordenacao/horarios",
    label: "Horários",
    icon: CalendarDays,
  },
  {
    section: "Operações",
    to: "/coordenacao/reservas",
    label: "Reservas de Espaços",
    icon: CalendarDays,
  },
  {
    section: "Operações",
    to: "/coordenacao/equipamentos",
    label: "Reservas de Equipamentos",
    icon: Package,
  },
  {
    section: "Comunicação",
    to: "/coordenacao/avisos",
    label: "Avisos",
    icon: BellRing,
  },
  {
    section: "Configurações",
    to: "/coordenacao/usuarios",
    label: "Usuários",
    icon: Shield,
  },
];

export const secretariaNavItems: NavItem[] = [
  { section: "Principal", to: "/secretaria", label: "Dashboard", icon: School },
  { section: "Gestão", to: "/secretaria/alunos", label: "Alunos", icon: GraduationCap },
  { section: "Gestão", to: "/secretaria/turmas", label: "Turmas", icon: Users },
  { section: "Serviços", to: "/secretaria/reservas", label: "Reservas de Espaços", icon: CalendarDays },
  { section: "Serviços", to: "/secretaria/equipamentos", label: "Reservas de Equipamentos", icon: Package },
];
