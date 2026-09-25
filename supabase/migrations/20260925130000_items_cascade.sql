-- Apagar um agendamento que NUNCA foi concluído nem recebeu pagamento deve levar seus itens junto
-- (o item é só o "preço congelado" da reserva). Concluídos/pagos continuam protegidos:
-- itens de concluído têm guarda de imutabilidade e payments/entries referenciam o agendamento com RESTRICT.
begin;
alter table public.appointment_items drop constraint appointment_items_appointment_id_fkey;
alter table public.appointment_items
  add constraint appointment_items_appointment_id_fkey
  foreign key (appointment_id) references public.appointments (id) on delete cascade;
commit;
