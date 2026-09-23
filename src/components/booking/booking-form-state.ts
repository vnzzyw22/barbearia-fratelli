import {
  isValidFutureDate,
  isValidName,
  isValidTime,
  isValidWhatsapp,
} from "@/lib/booking-validation";

export interface BookingFormData {
  serviceId: string;
  staffId: string;
  dateISO: string;
  time: string | null;
  name: string;
  whatsapp: string;
  notes: string;
}

export interface BookingFormState {
  step: number;
  // 1 = avançando (o novo step entra pela direita), -1 = voltando (entra
  // pela esquerda) — controla de que lado o slide horizontal aparece.
  direction: 1 | -1;
  data: BookingFormData;
  submitting: boolean;
  submitError: string | null;
  success: { whatsappLink: string | null } | null;
}

export type BookingFormAction =
  | { type: "SET_FIELD"; field: keyof BookingFormData; value: string | null }
  | { type: "GO_NEXT" }
  | { type: "GO_BACK" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "SUBMIT_SUCCESS"; whatsappLink: string | null };

export const STEP_LABELS = ["Serviço", "Data e horário", "Seus dados"];
export const LAST_STEP = STEP_LABELS.length - 1;

// Campos cuja troca invalida o horário já escolhido (mesma regra dos 3
// handlers que existiam antes: trocar serviço/profissional/data zera o
// horário selecionado, já que a disponibilidade depende dos três).
const FIELDS_THAT_RESET_TIME = new Set<keyof BookingFormData>([
  "serviceId",
  "staffId",
  "dateISO",
]);

export function initialBookingFormState(
  preselectedServiceId: string,
  preselectedStaffId: string,
): BookingFormState {
  return {
    step: 0,
    direction: 1,
    data: {
      serviceId: preselectedServiceId,
      staffId: preselectedStaffId,
      dateISO: "",
      time: null,
      name: "",
      whatsapp: "",
      notes: "",
    },
    submitting: false,
    submitError: null,
    success: null,
  };
}

export function bookingFormReducer(
  state: BookingFormState,
  action: BookingFormAction,
): BookingFormState {
  switch (action.type) {
    case "SET_FIELD": {
      const resetTime = FIELDS_THAT_RESET_TIME.has(action.field);
      return {
        ...state,
        data: {
          ...state.data,
          [action.field]: action.value,
          ...(resetTime ? { time: null } : {}),
        },
      };
    }
    case "GO_NEXT":
      return {
        ...state,
        direction: 1,
        step: Math.min(state.step + 1, LAST_STEP),
      };
    case "GO_BACK":
      return {
        ...state,
        direction: -1,
        step: Math.max(state.step - 1, 0),
      };
    case "SUBMIT_START":
      return { ...state, submitting: true, submitError: null };
    case "SUBMIT_ERROR":
      return { ...state, submitting: false, submitError: action.error };
    case "SUBMIT_SUCCESS":
      return {
        ...state,
        submitting: false,
        success: { whatsappLink: action.whatsappLink },
      };
    default:
      return state;
  }
}

export function isStepValid(step: number, data: BookingFormData): boolean {
  switch (step) {
    case 0:
      return Boolean(data.serviceId && data.staffId);
    case 1:
      return (
        Boolean(data.dateISO) &&
        isValidFutureDate(data.dateISO) &&
        Boolean(data.time && isValidTime(data.time))
      );
    case 2:
      return isValidName(data.name) && isValidWhatsapp(data.whatsapp);
    default:
      return false;
  }
}
