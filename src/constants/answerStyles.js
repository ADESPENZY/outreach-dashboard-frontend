// The three ways the interview copilot can word an answer, with a real sample of
// each so the choice is made by ear rather than by adjective.
//
// The ids match the backend (interview/styles.py: 'direct' | 'experience' |
// 'story'); `experience` is the default there too.
//
// The samples are written the way a confident person actually talks: contractions,
// short sentences, no corporate filler. They are canned copy, not model output —
// one candidate (a backend engineer) answering the same two questions three ways,
// so the difference between the styles is the only thing that changes.

export const SAMPLE_QUESTIONS = [
  { id: 'yourself', label: 'Tell me about yourself' },
  { id: 'kubernetes', label: 'What do you know about Kubernetes?' },
];

export const TYPE_SPEED_CPS = 35;   // characters per second

export const ANSWER_STYLE_CARDS = [
  {
    id: 'direct',
    label: 'Direct',
    blurb: 'Straight to the point. A clear, correct answer in plain spoken English.',
    samples: {
      yourself:
        "I'm a backend engineer — five years, mostly Python and Postgres. I build the parts of a "
        + "product that have to keep working: payments, payroll, anything where money or timing is "
        + "involved. What I'm good at is taking a fuzzy problem, shipping the simple version quickly, "
        + "then hardening it. I want a small team where I can own a problem end to end, which is "
        + "exactly what this role looks like.",
      kubernetes:
        "Kubernetes is how you run containers without babysitting them. You describe what you want — "
        + "three copies of this service, this much memory, restart it if it dies — and it keeps "
        + "reality matching that description. Day to day you're really working with deployments, "
        + "services and ingress; the rest is plumbing underneath. It earns its keep once you have "
        + "more than a couple of services, and it's honestly overkill before that.",
    },
  },
  {
    id: 'experience',
    label: 'From experience',
    badge: 'Recommended',
    blurb: 'The answer, plus where you have actually done it — drawn from your own CV.',
    samples: {
      yourself:
        "I'm a backend engineer, and the thread through my work is systems people depend on getting "
        + "paid by. At Acme I owned the payroll sync — Python, Postgres, and a lot of edge cases "
        + "nobody wants to think about. I've been the person who gets the 3am page, and it changed "
        + "how I build: smaller deploys, logs you can actually read, alerts that mean something. "
        + "That kind of ownership is what I'm looking for here.",
      kubernetes:
        "Yeah, I've run services on it in production — not as a platform engineer, but as the person "
        + "whose service was on the cluster. I was writing deployments, setting resource limits, "
        + "reading logs when a pod kept restarting. The big lesson was that most so-called Kubernetes "
        + "problems are really health-check and memory-limit problems. I can ship on it and debug my "
        + "own service comfortably; for cluster-level work I'd lean on a platform team.",
    },
  },
  {
    id: 'story',
    label: 'Story',
    blurb: 'One real moment from your CV, told the way you would tell a person.',
    samples: {
      yourself:
        "The clearest way to answer that is probably the payroll sync at Acme. It broke at 3am on a "
        + "Friday, the night before payday — about four hundred people weren't going to get paid. I "
        + "rolled it back first so everyone got their money, then spent the weekend working out that "
        + "two systems disagreed about what a pay period was. I rebuilt it so they couldn't disagree. "
        + "That's the work I like: something real on the line, and it's yours to fix.",
      kubernetes:
        "The time I really learned it, we had a service dying every few hours and nobody could say "
        + "why. Kubernetes was doing exactly what we'd told it to — the memory limit was too low, so "
        + "the pod got killed and quietly restarted, over and over. It took me a day of reading "
        + "kubectl describe output to spot it. We raised the limit, fixed the leak underneath, and "
        + "added a readiness probe that actually meant something. I've been comfortable with it since.",
    },
  },
];

export const DEFAULT_ANSWER_STYLE = 'experience';
