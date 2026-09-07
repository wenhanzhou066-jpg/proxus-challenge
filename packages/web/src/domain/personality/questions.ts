import type { Tetrad } from "./types.ts";

export const TETRADS: ReadonlyArray<Tetrad> = [
  {
    id: 1,
    prompt: "Acabas de recibir una tarea grande y nueva. Tu primer movimiento:",
    options: {
      R: "Divídela en hitos y empieza ya",
      Y: "Escribe a un amigo para estudiar juntos",
      G: "Léela dos veces, deja que repose un rato",
      B: "Investiga todo sobre el tema primero"
    }
  },
  {
    id: 2,
    prompt: "Trabajo en grupo, plazo en una semana. Tú:",
    options: {
      R: "Asignas roles y fijas el calendario",
      Y: "Lo conviertes en una lluvia de ideas divertida",
      G: "Preguntas con qué se siente cómodo cada uno",
      B: "Montas un plan detallado con cronograma"
    }
  },
  {
    id: 3,
    prompt: "Estudias solo por la noche. Tú:",
    options: {
      R: "Compites contra el reloj",
      Y: "Pones una playlist y haces pausas frecuentes",
      G: "Sigues la rutina de siempre",
      B: "Tomas notas detalladas, releyendo capítulos"
    }
  },
  {
    id: 4,
    prompt: "No estás de acuerdo con algo que dijo el profesor. Tú:",
    options: {
      R: "Le rebates en clase",
      Y: "Bromeas sobre ello con tus compañeros después",
      G: "No dices nada, lo dejas pasar",
      B: "Lo compruebas más tarde para verificar los hechos"
    }
  },
  {
    id: 5,
    prompt: "Examen mañana, no estás preparado. Tú:",
    options: {
      R: "Pasas la noche en vela, a lo bruto",
      Y: "Escribes a amigos para empollar juntos",
      G: "Haces lo que puedes y aceptas el resultado",
      B: "Priorizas los temas con más probabilidad de caer"
    }
  },
  {
    id: 6,
    prompt: "Alguien te da instrucciones poco claras. Tú:",
    options: {
      R: "Empiezas ya, lo resuelves sobre la marcha",
      Y: "Le pides que te lo explique paso a paso",
      G: "Esperas a que quede más claro",
      B: "Pides especificaciones por escrito"
    }
  },
  {
    id: 7,
    prompt: "Tu plan de estudio se ve interrumpido. Tú:",
    options: {
      R: "Te adaptas rápido y sigues adelante",
      Y: "Lo tomas con calma — los planes son aburridos",
      G: "Te sientes inquieto, quieres reprogramar",
      B: "Rehaces el plan desde cero"
    }
  },
  {
    id: 8,
    prompt: "Un tema nuevo te resulta abrumador. Tú:",
    options: {
      R: "Atacas primero la parte más difícil",
      Y: "Ves un vídeo de introducción divertido",
      G: "Lo divides en pequeños pasos constantes",
      B: "Buscas el libro de texto definitivo"
    }
  },
  {
    id: 9,
    prompt: "Recibes críticas duras a tu trabajo. Tú:",
    options: {
      R: "Discutes si crees que se equivocan",
      Y: "Lo esquivas con humor y luego lo arreglas",
      G: "Te lo tomas personal, trabajas en silencio",
      B: "Analizas cada punto en detalle"
    }
  },
  {
    id: 10,
    prompt: "Un amigo te pide ayuda para estudiar. Tú:",
    options: {
      R: "Vas al grano, enseñas rápido",
      Y: "Lo conviertes en una sesión compartida",
      G: "Te sientas con él el tiempo que haga falta",
      B: "Le explicas la teoría subyacente"
    }
  },
  {
    id: 11,
    prompt: "Tarde libre, sin planes. Tú:",
    options: {
      R: "Avanzas algo importante",
      Y: "Escribes a la gente, buscas algo divertido",
      G: "Disfrutas de un rato tranquilo en casa",
      B: "Profundizas en un hobby o tema"
    }
  },
  {
    id: 12,
    prompt: "Gran decisión que tomar. Tú:",
    options: {
      R: "Decides rápido, ajustas después",
      Y: "Preguntas a tus amigos qué opinan",
      G: "Lo consultas con la almohada",
      B: "Haces una lista de pros y contras"
    }
  }
];
