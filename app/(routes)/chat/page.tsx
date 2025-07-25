"use client"

import type React from "react"
import { useChat } from '@ai-sdk/react';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Send, User, ChevronDown, Zap, Trophy, Globe, Check, Copy } from "lucide-react"
import { Pencil } from "lucide-react"
import { useState, useRef, useEffect, FormEvent } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { EarlyAccess } from "@/components/views/early-access"
import { SolanaWalletButton } from "@/components/wallet"
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { HackathonProject, HackathonProjectCard } from "@/components/hackathons/hackathon-project-card";
import { cn } from "@/lib/utils";
import { HackathonLoader } from "@/components/hackathons/hackathon-loader";
import { BlinkCarousel } from "@/components/blinks/blink-carousel";
import { BlinkSkeleton } from "@/components/blinks/blink-skeleton";
import Link from "next/link";
import { config } from "@/lib/config";
import { X } from "@/components/icons/x";
import { GitHub } from "@/components/icons/github";
import { Discord } from "@/components/icons/discord";
import { Instagram } from "@/components/icons/instagram";

type AssistantMode = "Ecosystem" | "Blinks" | "Hackathons"
type HackathonSubMode = "Colosseum" | null
type CollosseumEvent = "Renaissance" | "Radar" | "Breakout" | null

const scrollingStyle = `
  @keyframes scroll-left {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }
  
  .animate-scroll-left {
    animation: scroll-left 30s linear infinite;
  }
  
  .animate-scroll-left:hover {
    animation-play-state: paused;
  }
`

export default function ChatPage() {
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const { messages, input, handleInputChange, handleSubmit, status, append, setInput, setMessages } = useChat({
        api: "api/sol-ai",
        onFinish() {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

        },
    });

    const { connected, publicKey } = useWallet()

    const [assistantMode, setAssistantMode] = useState<AssistantMode>("Ecosystem")
    const [hackathonSubMode, setHackathonSubMode] = useState<HackathonSubMode>(null)
    const [collosseumEvent, setCollosseumEvent] = useState<CollosseumEvent>(null)
    const [hackathonData, setHackathonData] = useState<HackathonProject[]>([])
    const [isHackathonsLoading, setIsHackathonsLoading] = useState(false)
    const [isBlinksLoading, setIsBlinksLoading] = useState(false)
    const [isQuestionLimitLoading, setIsQuestionLimitLoading] = useState(false)
    const [checkedAccess, setCheckedAccess] = useState(false)
    const [isVerified, setIsVerified] = useState(false)
    const [blinksUrl, setBlinksUrl] = useState<string[]>([]);
    const [questionCount, setQuestionCount] = useState<number>(0)
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    const socialMedia = [
        {
            link: config.socialMedia.x,
            icon: <X className="fill-zinc-500 hover:fill-solana-purple transition-colors" />
        },
        {
            link: config.socialMedia.github,
            icon: <GitHub className="fill-zinc-500 hover:fill-solana-purple transition-colors" />
        },
        {
            link: config.socialMedia.discord,
            icon: <Discord className="fill-zinc-500 hover:fill-solana-purple transition-colors" />
        },
        {
            link: config.socialMedia.instagram,
            icon: <Instagram className="fill-zinc-500 hover:fill-solana-purple transition-colors" />
        },
    ]

    const preSelectedQuestions = [
        "What is Solana and how does it work?",
        "How do Solana Blinks work?",
        "What are the best Solana projects to explore?",
        "How do I get started with Solana development?",
        "What makes Solana different from other blockchains?",
        "Tell me about Solana's consensus mechanism",
        "What are the most popular Solana wallets?",
        "How does Solana handle smart contracts?",
    ]

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedMessageId(id);
            setTimeout(() => setCopiedMessageId(null), 2000); // reset after 2s
        });
    };

    const cleanConversation = () => {
        setMessages([])
        setInput("")
        setHackathonData([])
        setBlinksUrl([])
    }

    const handleModeChange = (
        mode: AssistantMode,
        subMode?: HackathonSubMode,
        event?: CollosseumEvent,
    ) => {
        setAssistantMode(mode)
        setHackathonSubMode(subMode || null)
        setCollosseumEvent(null)

        if (mode === "Hackathons" && subMode === "Colosseum" && event) {
            setCollosseumEvent(event as CollosseumEvent)
        }
    }

    const getModeIcon = () => {
        switch (assistantMode) {
            case "Blinks":
                return <Zap className="w-4 h-4" />
            case "Hackathons":
                return <Trophy className="w-4 h-4" />
            default:
                return <Globe className="w-4 h-4" />
        }
    }

    const getCurrentModeLabel = () => {
        if (assistantMode === "Hackathons") {
            if (hackathonSubMode === "Colosseum") {
                if (collosseumEvent) return `Colosseum - ${collosseumEvent}`
                return "Colosseum"
            }
        }
        return assistantMode
    }

    const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const walletAddress = publicKey?.toBase58()
        if (!walletAddress || !input.trim()) return

        if (questionCount >= 15) {
            alert("You've reached your 15-question limit for today.")
            return
        }

        setIsQuestionLimitLoading(true)

        try {
            let success = false

            if (assistantMode === "Ecosystem") {
                handleSubmit()
                success = true

            } else if (assistantMode === "Hackathons") {
                setIsHackathonsLoading(true)
                try {
                    const response = await fetch(`/api/hackathons`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            query: input,
                            hackathon: collosseumEvent?.toLowerCase()
                        })
                    })

                    if (!response.ok) throw new Error("Hackathon API error")

                    const data = await response.json()
                    setHackathonData(data?.projects)
                    setInput("")
                    success = true
                } catch (err) {
                    console.error("Failed to fetch hackathons:", err)
                }

            } else if (assistantMode === "Blinks") {
                setIsBlinksLoading(true)
                try {
                    const response = await fetch(`/api/blinks`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ query: input }),
                    })

                    if (!response.ok) throw new Error("Blinks API error")

                    const data = await response.json()
                    const urls = data?.blinks?.map((item: { action_url: string }) => item.action_url) || []
                    setBlinksUrl(urls)
                    setInput("")
                    success = true
                } catch (err) {
                    console.error("Failed to fetch blinks:", err)
                }
            }

            if (success) {
                const res = await fetch(`/api/question-limit`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ wallet: walletAddress })
                })

                const result = await res.json()
                setQuestionCount(result?.question_count || questionCount)
            }

        } catch (err) {
            console.error("Submission error:", err)
        } finally {
            setIsHackathonsLoading(false)
            setIsBlinksLoading(false)
            setIsQuestionLimitLoading(false)
        }
    }

    useEffect(() => {
        const styleElement = document.createElement("style")
        styleElement.textContent = scrollingStyle
        document.head.appendChild(styleElement)

        return () => {
            document.head.removeChild(styleElement)
        }
    }, [])

    useEffect(() => {
        const checkAccess = async () => {
            if (!connected || !publicKey) return

            try {
                const res = await fetch(`/api/verify-status?wallet=${publicKey.toBase58()}`)
                const result = await res.json()

                if (res.ok) {
                    setIsVerified(result?.verified)
                }
            } catch (err) {
                console.error('Failed to check verification status', err)
            } finally {
                setCheckedAccess(true)
            }
        }

        checkAccess()
    }, [connected, publicKey])

    useEffect(() => {
        const fetchQuestionCount = async () => {
            if (!connected || !publicKey) return;

            try {
                const res = await fetch(`/api/question-limit?wallet=${publicKey.toBase58()}`);
                const data = await res.json();

                if (res.ok) {
                    setQuestionCount(data?.question_count || 0);
                } else {
                    console.warn("Failed to get question count:", data?.error);
                }
            } catch (err) {
                console.error("Error fetching question count:", err);
            }
        }

        fetchQuestionCount();
    }, [connected, publicKey]);

    if (!checkedAccess || !isVerified) {
        return <EarlyAccess />
    }

    return (
        <section className="min-h-screen bg-black text-white relative">
            <div className="relative z-10 flex flex-col h-screen">
                <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm relative z-50">
                    <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col items-center justify-between gap-4 md:flex-row">
                        <div className="w-full flex justify-between items-center gap-4">
                            <div className="flex items-center space-x-4">
                                <Button onClick={cleanConversation} variant="outline" size="sm" className="cursor-pointer border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white">
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <SolanaWalletButton />
                            </div>
                            <h1 className="text-lg font-medium text-white">Sol AI</h1>
                        </div>
                        <div className="flex items-center justify-between space-x-3 w-full md:justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="cursor-pointer border-[var(--solana-purple)]/30 text-[var(--solana-purple)] hover:bg-[var(--solana-purple)]/10"
                                    >
                                        {getModeIcon()}
                                        <span className="ml-2 text-white">{getCurrentModeLabel()}</span>
                                        <ChevronDown className="w-3 h-3 ml-1 text-white" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-gray-900 border-gray-700">
                                    <DropdownMenuItem onClick={() => handleModeChange("Ecosystem")}>
                                        <Globe className="w-4 h-4 mr-2" />
                                        Ecosystem
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleModeChange("Blinks")}>
                                        <Zap className="w-4 h-4 mr-2" />
                                        Blinks
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            <Trophy className="w-4 h-4 mr-2" />
                                            Hackathons
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent className="bg-gray-900 border-gray-700">
                                            <DropdownMenuSub>
                                                <DropdownMenuSubTrigger>Colosseum</DropdownMenuSubTrigger>
                                                <DropdownMenuSubContent className="bg-gray-900 border-gray-700">
                                                    <DropdownMenuItem onClick={() => handleModeChange("Hackathons", "Colosseum", "Renaissance")}>
                                                        Renaissance
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleModeChange("Hackathons", "Colosseum", "Radar")}>
                                                        Radar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleModeChange("Hackathons", "Colosseum", "Breakout")}>
                                                        Breakout
                                                    </DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuSub>
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div key={"a"} className="flex justify-start">
                            <div
                                className="flex items-start space-x-3 max-w-3xl relative"
                            >
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-black"
                                >

                                    <img
                                        src="/images/brand/logo.png"
                                        width={854}
                                        height={210}
                                        title="Logo"
                                        alt="Logo"
                                        className="max-w-6 h-auto w-full"
                                    />
                                </div>
                                <Card
                                    className="bg-gray-900/80 border-gray-700/50 backdrop-blur-sm py-0"
                                >
                                    <CardContent className="p-4">
                                        <p className="text-gray-100 leading-relaxed">
                                            {assistantMode === "Hackathons" ? (
                                                collosseumEvent ? (
                                                    <>Welcome to the <strong className="text-solana-purple">{collosseumEvent}</strong> Hackathon on Solana! Ready to explore projects?</>
                                                ) : (
                                                    <>Exploring Solana Hackathons? I&apos;m here to help you discover projects, past winners, and more.</>
                                                )
                                            ) : assistantMode === "Blinks" ? (
                                                <><strong className="text-solana-purple">Blinks</strong> provide a Solana gateway to the entire internet. Which blinks would you like to explore?</>
                                            ) : (
                                                <>Hi there! I&apos;m Sol AI, your virtual assistant ready to help you explore Solana. How can I assist you today?</>
                                            )}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {
                            assistantMode === "Ecosystem" ? (
                                <>

                                    {messages.map((message) => {
                                        const isAssistant = message?.role === "assistant";

                                        return (
                                            <div key={message?.id} className={`flex ${message?.role === "user" ? "justify-end" : "items-start flex-col"}`}>
                                                <div
                                                    className={`flex items-start space-x-3 max-w-3xl relative ${message?.role === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message?.role === "user" ? "bg-gray-700" : "bg-black"}`}>
                                                        {message?.role === "user" ? (
                                                            <User className="w-4 h-4 text-white" />
                                                        ) : (
                                                            <img
                                                                src="/images/brand/logo.png"
                                                                width={854}
                                                                height={210}
                                                                title="Logo"
                                                                alt="Logo"
                                                                className="max-w-6 h-auto w-full"
                                                            />
                                                        )}
                                                    </div>
                                                    <Card className={`${message?.role === "user" ? "bg-[var(--solana-purple)]/20 border-[var(--solana-purple)]/30" : "bg-gray-900/80 border-gray-700/50"} backdrop-blur-sm py-0 w-full`}>
                                                        <CardContent className="p-4 flex flex-col justify-start items-start gap-3 relative">
                                                            <Markdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    p(props) {
                                                                        return <p className="block" {...props} />
                                                                    },
                                                                    a(props) {
                                                                        return <a target="_blank" rel="noopener noreferrer" className="font-semibold cursor-pointer text-solana-green underline" {...props} />
                                                                    },
                                                                    ul(props) {
                                                                        return <ul className="flex flex-col justify-center items-start gap-4" {...props} />
                                                                    },
                                                                    ol(props) {
                                                                        return <ol className="flex flex-col justify-center items-start gap-4" {...props} />
                                                                    },
                                                                }}
                                                            >
                                                                {message?.content}
                                                            </Markdown>

                                                        </CardContent>
                                                    </Card>
                                                </div>
                                                {isAssistant && (
                                                    <Button
                                                        onClick={() => handleCopy(message?.id, message?.content)}
                                                        className="text-white hover:text-solana-purple transition-all ml-11 mt-4 cursor-pointer border-none"
                                                        title={copiedMessageId === message?.id ? "Copied!" : "Copy to clipboard"}
                                                        variant='outline'
                                                        size="icon"
                                                    >
                                                        {copiedMessageId === message?.id ? (
                                                            <Check className="w-4 h-4 text-green-400" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {status === "submitted" ? (
                                        <div
                                            className={`space-x-3 max-w-max h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-black`}
                                        >
                                            <img
                                                src="/images/brand/logo.png"
                                                width={854}
                                                height={210}
                                                title="Logo"
                                                alt="Logo"
                                                className="max-w-6 h-auto w-full"
                                            />

                                            <div className="flex items-center justify-center space-x-2">
                                                <div className="flex space-x-1">
                                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : ""}
                                </>
                            ) : ""
                        }

                        {
                            assistantMode === "Hackathons" ? (
                                isHackathonsLoading ? (
                                    <HackathonLoader />
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {hackathonData?.map((project) => (
                                            <HackathonProjectCard key={project.id} project={project} />
                                        ))}
                                    </div>
                                )
                            ) : ""
                        }

                        {
                            assistantMode === "Blinks" ? (
                                isBlinksLoading ? (
                                    <BlinkSkeleton />
                                ) : (
                                    blinksUrl.length > 0 ? (
                                        <BlinkCarousel blinksUrl={blinksUrl} />
                                    ) : ""
                                )
                            ) : null
                        }

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {messages.length === 0 && assistantMode === "Ecosystem" ? (
                    <div className="px-6 py-4 border-t border-gray-800">
                        <div className="max-w-4xl mx-auto">
                            <p className="text-sm text-gray-400 mb-3">Quick questions to get started!</p>
                            <div className="overflow-hidden relative">
                                <div className="flex space-x-2 animate-scroll-left">
                                    {preSelectedQuestions.map((question, index) => (
                                        <Button
                                            key={`first-${index}`}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                append({
                                                    role: "user",
                                                    content: question
                                                })
                                            }}
                                            className="cursor-pointer border-[var(--solana-purple)]/30 text-white hover:bg-[var(--solana-purple)]/10 text-xs whitespace-nowrap flex-shrink-0 min-w-max"
                                        >
                                            {question}
                                        </Button>
                                    ))}

                                    {preSelectedQuestions.map((question, index) => (
                                        <Button
                                            key={`second-${index}`}
                                            variant="outline"
                                            size="sm"
                                            className="cursor-pointer border-[var(--solana-purple)]/30 text-[var(--solana-purple)] hover:bg-[var(--solana-purple)]/10 text-xs whitespace-nowrap flex-shrink-0 min-w-max"
                                        >
                                            {question}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : ""}

                <div className="border-t border-gray-800 bg-black/80 backdrop-blur-sm">
                    <div className="max-w-4xl mx-auto px-6 py-4">
                        <form onSubmit={handleFormSubmit} className="flex space-x-3">
                            <Input
                                name="prompt"
                                autoComplete="off"
                                value={input}
                                onChange={handleInputChange}
                                placeholder="Ask me anything about Solana..."
                                className="flex-1 bg-gray-900/80 border-gray-700/50 text-white placeholder-gray-400 focus:border-[var(--solana-purple)]/50"
                                disabled={status === "streaming" || status === "submitted" || isHackathonsLoading || isBlinksLoading || isQuestionLimitLoading}
                            />

                            <Button
                                type="submit"
                                className={cn(status === "streaming" || status === "submitted" || isHackathonsLoading || isBlinksLoading || isQuestionLimitLoading || !input.trim() ? "select-none cursor-default pointer-events-none bg-gray-800/50 text-white/30" : "bg-gradient-to-r from-[var(--solana-purple)] to-[var(--solana-green)] hover:from-[var(--solana-purple)]/90 hover:to-[var(--solana-green)]/90  cursor-pointer text-white")}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>

                        <p className="text-xs text-gray-400 text-left mt-2 mb-2">
                            {`Questions today: ${questionCount} / 15`}
                        </p>

                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Sol AI can make mistakes. Please verify important information.
                        </p>

                        <div className="flex items-center w-full justify-between gap-5 mt-4">
                            <span className="w-full text-xs text-gray-200 text-left inline-block mx-auto">From 🌎 LATAM to Solana 💜</span>
                            <ul className="flex justify-center items-center gap-x-5">
                                {
                                    socialMedia.map(({ link, icon }) => (
                                        <li key={link}>
                                            <Link href={link} target="_blank">
                                                <span className="[&>svg]:h-3 [&>svg]:w-3">
                                                    {icon}
                                                </span>
                                            </Link>
                                        </li>
                                    ))
                                }
                            </ul>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    )
}