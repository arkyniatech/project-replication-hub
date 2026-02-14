import { ItinerarioDiario } from "@/modules/logistica/ItinerarioDiario";
import { guardRoute } from "@/hooks/useRbac";

function ItineraryPage() {
  return <ItinerarioDiario />;
}

export default guardRoute(['logistica:operar'])(ItineraryPage);