import type { Tetrad } from "./types.ts";

export const TETRADS: ReadonlyArray<Tetrad> = [
  {
    id: 1,
    prompt: "You just got a big new assignment. Your first move:",
    options: {
      R: "Break it into milestones and start now",
      Y: "Message a friend to study together",
      G: "Read it twice, sit with it a bit",
      B: "Research everything about the topic first"
    }
  },
  {
    id: 2,
    prompt: "Group project, deadline in a week. You:",
    options: {
      R: "Assign roles and set the schedule",
      Y: "Turn it into a fun brainstorm",
      G: "Ask what everyone's comfortable doing",
      B: "Build a detailed plan and timeline"
    }
  },
  {
    id: 3,
    prompt: "Studying alone at night. You:",
    options: {
      R: "Race yourself against the clock",
      Y: "Put on a playlist, take frequent breaks",
      G: "Follow the same routine as always",
      B: "Take detailed notes, re-read chapters"
    }
  },
  {
    id: 4,
    prompt: "You disagree with something the teacher said. You:",
    options: {
      R: "Push back in class",
      Y: "Joke about it with classmates after",
      G: "Say nothing, let it go",
      B: "Look it up later to check the facts"
    }
  },
  {
    id: 5,
    prompt: "Exam tomorrow, you're not ready. You:",
    options: {
      R: "Pull an all-nighter, brute force it",
      Y: "Text friends to cram together",
      G: "Do what you can, accept the outcome",
      B: "Prioritize the topics most likely to appear"
    }
  },
  {
    id: 6,
    prompt: "Someone gives you unclear instructions. You:",
    options: {
      R: "Just start, figure it out as you go",
      Y: "Ask them to walk you through it",
      G: "Wait until it's clearer",
      B: "Ask for written specs"
    }
  },
  {
    id: 7,
    prompt: "Your study plan gets disrupted. You:",
    options: {
      R: "Adapt fast, keep moving",
      Y: "Roll with it — plans are boring anyway",
      G: "Feel unsettled, want to reschedule",
      B: "Rebuild the plan from scratch"
    }
  },
  {
    id: 8,
    prompt: "New topic feels overwhelming. You:",
    options: {
      R: "Attack the hardest part first",
      Y: "Watch a fun intro video",
      G: "Break it into small steady steps",
      B: "Find the definitive textbook"
    }
  },
  {
    id: 9,
    prompt: "You get harsh feedback on your work. You:",
    options: {
      R: "Argue if you think they're wrong",
      Y: "Deflect with humor, then fix it",
      G: "Take it personally, work quietly",
      B: "Analyze each point in detail"
    }
  },
  {
    id: 10,
    prompt: "A friend asks for study help. You:",
    options: {
      R: "Get to the point, teach fast",
      Y: "Turn it into a shared session",
      G: "Sit with them as long as needed",
      B: "Explain the underlying theory"
    }
  },
  {
    id: 11,
    prompt: "Free evening, no plans. You:",
    options: {
      R: "Get ahead on something important",
      Y: "Text people, find something fun",
      G: "Enjoy quiet time at home",
      B: "Deep-dive a hobby or topic"
    }
  },
  {
    id: 12,
    prompt: "Big decision to make. You:",
    options: {
      R: "Decide fast, adjust later",
      Y: "Ask friends what they think",
      G: "Sleep on it",
      B: "List pros and cons"
    }
  }
];
