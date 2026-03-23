import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Search,
  MessageSquare,
  FileX,
  ShieldAlert,
  BarChart3,
  Sparkles,
  Bot,
  Coins,
  CheckCircle,
  TrendingUp,
  Target,
  Zap,
  Globe,
  Clock,
  DollarSign,
  PieChart,
} from "lucide-react";
import { ProblemCard } from "./components/ProblemCard";
import { SolutionCard } from "./components/SolutionCard";
import { StepCard } from "./components/StepCard";
import { BenefitCard } from "./components/BenefitCard";
import { Button } from "./components/Button";
import { DashboardMockup } from "./components/DashboardMockup";
import { SectionBadge } from "./components/SectionBadge";
import { StatsGraph } from "./components/StatsGraph";
import { BenefitsPattern } from "./components/BenefitsPattern";
import { CircularProgress } from "./components/CircularProgress";
import logoUrl from "../assets/logo.svg";

const navItems = [
  { label: "Problem", href: "#problem" },
  { label: "Solution", href: "#solution" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Benefits", href: "#benefits" },
];

const legalItems = [
  {
    label: "Terms of Use",
    href: "/terms",
  },
  {
    label: "Privacy Policy",
    href: "/privacy",
  },
];

const heroFlow = [
  { label: "Discovery", value: "24 channels matched" },
  { label: "Negotiation", value: "7 deals in progress" },
  { label: "Results", value: "2.4M views tracked" },
];

type WorkflowStep = {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

const workflowSteps: WorkflowStep[] = [
  {
    number: "01",
    icon: Target,
    title: "Create campaign",
    description: "Set your goal, budget, and campaign details.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Channel recommendation",
    description: "The agent finds Telegram channels that match your campaign.",
  },
  {
    number: "03",
    icon: Bot,
    title: "Negotiation",
    description: "The agent talks to admins and agrees on the price.",
  },
  {
    number: "04",
    icon: Coins,
    title: "Approval and payment",
    description: "Review the deal and confirm the purchase in one click.",
  },
  {
    number: "05",
    icon: TrendingUp,
    title: "Results and analytics",
    description: "Track publications, views, and subscribers in real time.",
  },
];

export default function App() {
  const year = new Date().getFullYear();
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

  useEffect(() => {
    const updateHeaderBorder = () => {
      const nextScrolled = window.scrollY > 8;
      setIsHeaderScrolled((prev) =>
        prev === nextScrolled ? prev : nextScrolled,
      );
    };

    updateHeaderBorder();
    window.addEventListener("scroll", updateHeaderBorder, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateHeaderBorder);
    };
  }, []);

  return (
    <div id="top" className="min-h-screen bg-white text-black">
      <header
        className={`sticky top-0 z-30 border-b-2 bg-white/95 backdrop-blur transition-colors duration-300 ${
          isHeaderScrolled ? "border-black" : "border-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <a href="#top" className="flex items-center gap-3">
            <span className="flex h-11 items-center">
              <img
                src={logoUrl}
                alt="AdAgent logo"
                className="h-11 w-auto object-contain"
              />
            </span>
            <span className="block">
              <span className="block text-sm font-bold uppercase tracking-[0.24em]">
                AdAgent
              </span>
              <span className="block text-xs opacity-60">
                Telegram Campaign Manager
              </span>
            </span>
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-6 text-sm font-semibold lg:flex"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-opacity duration-300 hover:opacity-60"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-wrap gap-3">
            <a
              href="#how-it-works"
              className="border-2 border-black bg-white px-5 py-3 text-sm font-semibold transition-colors duration-300 hover:bg-black hover:text-white"
            >
              Watch demo
            </a>
            <a
              href="#final-cta"
              className="border-2 border-black bg-black px-5 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-white hover:text-black"
            >
              Start campaign
            </a>
          </div>
        </div>
      </header>

      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-7xl px-6 pt-12 pb-20 lg:pt-16 lg:pb-32">
          <div className="flex flex-col gap-12 md:flex-row md:items-center md:justify-between md:gap-8 lg:gap-12 xl:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="md:min-w-0 md:max-w-[34rem] md:flex-1 lg:max-w-[40rem]"
            >
              <h1 className="mb-6 text-5xl leading-[0.96] font-bold lg:text-6xl xl:text-7xl">
                More awareness.
                <br />
                More traffic.
                <br />
                More subscribers.
                <br />
                <span className="opacity-60">Less manual work.</span>
              </h1>
              <p className="mb-8 max-w-xl text-xl leading-[1.3] opacity-80 lg:text-2xl">
                Run Telegram ad campaigns through an AI agent that finds
                channels, negotiates with admins, pays in TON, and tracks
                results.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#final-cta">
                  <Button variant="primary">Start campaign</Button>
                </a>
                <a href="#how-it-works">
                  <Button variant="secondary">Watch demo</Button>
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative mx-auto w-full max-w-md md:ml-auto md:w-[360px] md:max-w-none md:flex-none lg:w-[420px] xl:w-[520px]"
            >
              <div className="relative border-2 border-black bg-black p-4 text-white shadow-[12px_12px_0px_0px_rgba(0,0,0,0.12)] sm:p-5 lg:p-4 xl:p-5">
                <div className="mb-3 flex items-start justify-between gap-4 border-b border-white/20 pb-3 lg:mb-3 lg:pb-3 xl:mb-4 xl:pb-4">
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.24em] opacity-60">
                      Campaign structure
                    </div>
                    <div className="text-xl font-bold sm:text-2xl xl:text-3xl">
                      Ad workflow at a glance
                    </div>
                  </div>
                  <div className="border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                    Live
                  </div>
                </div>

                <div className="mb-3 grid gap-2 sm:grid-cols-3 lg:mb-3 xl:mb-4 xl:gap-3">
                  {heroFlow.map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                      className="border border-white/30 bg-white/5 p-2.5 lg:p-2.5 xl:p-3"
                    >
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] opacity-60">
                        {item.label}
                      </div>
                      <div className="text-xs font-semibold leading-5 sm:text-sm">
                        {item.value}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="bg-white p-3 text-black lg:p-2.5 xl:p-4">
                  <DashboardMockup />
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55 }}
                className="absolute -right-4 -bottom-5 border-2 border-black bg-white px-4 py-3 text-sm font-semibold shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:-right-6"
              >
                87% of campaign ops automated
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="problem" className="border-b-2 border-black bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <SectionBadge>Problem</SectionBadge>
            <h2 className="mb-4 text-4xl font-bold lg:text-5xl xl:text-6xl">
              Telegram ad buying is still manual
            </h2>
            <p className="mb-12 max-w-3xl text-xl opacity-70 lg:text-2xl">
              Finding channels, negotiating with admins, tracking deals,
              verifying posts, and collecting analytics happens across chats,
              spreadsheets, and notes.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ProblemCard
              icon={Search}
              title="Manual channel search"
              description="You spend hours looking for the right channels."
              index={0}
            />
            <ProblemCard
              icon={MessageSquare}
              title="Endless admin chats"
              description="Every deal requires back-and-forth messages."
              index={1}
            />
            <ProblemCard
              icon={FileX}
              title="No deal tracking"
              description="Campaign details get lost in conversations."
              index={2}
            />
            <ProblemCard
              icon={ShieldAlert}
              title="Hard to verify posts"
              description="You never know if everything was published correctly."
              index={3}
            />
            <ProblemCard
              icon={BarChart3}
              title="Scattered analytics"
              description="Results live in screenshots, links, and tables."
              index={4}
            />
          </div>
        </div>
      </section>

      <section
        id="solution"
        className="border-b-2 border-black bg-black text-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <SectionBadge variant="dark">Solution</SectionBadge>
            <h2 className="mb-4 text-4xl font-bold lg:text-5xl xl:text-6xl">
              One agent runs the whole campaign
            </h2>
            <p className="mb-12 max-w-3xl text-xl opacity-70 lg:text-2xl">
              Create a campaign once. The agent finds channels, negotiates
              deals, sends payments, verifies posts, and tracks results.
            </p>
          </motion.div>

          <div className="mx-auto mb-16 grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
            <CircularProgress percentage={95} label="Automation" />
            <CircularProgress percentage={80} label="Time Saved" />
            <CircularProgress percentage={100} label="Accuracy" />
            <CircularProgress percentage={90} label="ROI Boost" />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <SolutionCard
              icon={Sparkles}
              title="Channel recommendation"
              description="The agent finds the best channels for your campaign."
              index={0}
            />
            <SolutionCard
              icon={Bot}
              title="Negotiation automation"
              description="No more back-and-forth with admins."
              index={1}
            />
            <SolutionCard
              icon={Coins}
              title="TON payments"
              description="Move from deal to payment instantly."
              index={2}
            />
            <SolutionCard
              icon={CheckCircle}
              title="Post verification"
              description="Know when your ad is published."
              index={3}
            />
            <SolutionCard
              icon={BarChart3}
              title="Campaign analytics"
              description="Track results in one place."
              index={4}
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b-2 border-black bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="w-full lg:sticky lg:top-28 lg:w-[600px] lg:flex-none lg:self-start"
            >
              <SectionBadge>How it works</SectionBadge>
              <h2 className="mb-6 text-4xl font-bold lg:text-5xl xl:text-6xl">
                From idea to results in one flow
              </h2>
              <p className="max-w-md text-lg leading-7 opacity-70 lg:text-xl">
                Move through campaign creation, channel matching, negotiation,
                payment, and reporting in one visible sequence.
              </p>
            </motion.div>

            <div className="w-full space-y-8 sm:space-y-10 lg:ml-auto lg:min-w-0 lg:max-w-3xl lg:flex-1 lg:space-y-24 lg:pl-8">
              {workflowSteps.map((step, index) => (
                <div
                  key={step.number}
                  className="lg:sticky lg:top-28"
                  style={{ zIndex: index + 1 }}
                >
                  <StepCard
                    number={step.number}
                    icon={step.icon}
                    title={step.title}
                    description={step.description}
                    index={index}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="benefits"
        className="relative overflow-hidden border-b-2 border-black bg-white"
      >
        <BenefitsPattern />
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <SectionBadge>Benefits</SectionBadge>
            <h2 className="mb-16 text-4xl font-bold lg:text-5xl xl:text-6xl">
              Built for faster campaign growth
            </h2>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <BenefitCard
              icon={Clock}
              title="Less manual work"
              description="Stop searching channels and negotiating in chats."
              index={0}
            />
            <BenefitCard
              icon={Target}
              title="Better channel matching"
              description="Find the right Telegram channels faster."
              index={1}
            />
            <BenefitCard
              icon={Globe}
              title="Transparent deals"
              description="See price, status, and history in one place."
              index={2}
            />
            <BenefitCard
              icon={Zap}
              title="Faster campaign launch"
              description="Go from idea to post in minutes."
              index={3}
            />
            <BenefitCard
              icon={PieChart}
              title="All analytics in one place"
              description="Track views, clicks, and subscribers easily."
              index={4}
            />
            <BenefitCard
              icon={DollarSign}
              title="Native TON payments"
              description="Move from deal to payment instantly."
              index={5}
            />
          </div>
        </div>
      </section>

      <section id="final-cta" className="bg-black text-white">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <SectionBadge variant="dark">Let the agent do it</SectionBadge>
            <h2 className="mb-6 text-4xl font-bold lg:text-6xl xl:text-7xl">
              Run your next Telegram campaign with an agent
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-xl opacity-70 lg:text-2xl">
              From channel discovery to payment and analytics — all in one flow.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="border-2 border-white bg-white px-8 py-4 font-semibold text-black transition-colors duration-300 hover:bg-black hover:text-white">
                Start campaign
              </button>
              <button className="border-2 border-white bg-black px-8 py-4 font-semibold text-white transition-colors duration-300 hover:bg-white hover:text-black">
                Watch demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t-2 border-white/20 bg-black text-white">
        <div className="mx-auto flex max-w-7xl flex-row flex-wrap items-start justify-between gap-12 px-6 py-12">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex items-center">
                <img
                  src={logoUrl}
                  alt="AdAgent logo"
                  className="h-7 w-auto object-contain invert"
                />
              </span>
              <span className="block">
                <span className="block text-sm font-bold uppercase tracking-[0.24em]">
                  AdAgent
                </span>
                <span className="block text-xs opacity-60">
                  Telegram Campaign Manager
                </span>
              </span>
            </div>
            <p className="max-w-md text-sm leading-7 opacity-70">
              Run Telegram ad campaigns with one operational layer for channel
              discovery, negotiation, payments, verification, and analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm font-semibold">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-opacity duration-300 hover:opacity-60"
              >
                {item.label}
              </a>
            ))}
            {legalItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-opacity duration-300 hover:opacity-60"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div className="border-t border-white/20 px-6 py-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs opacity-60 md:flex-row md:items-center md:justify-between">
            <span>{year} AdAgent. All rights reserved.</span>
            <span>
              Built for Telegram ad campaign growth with AI-assisted execution.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
