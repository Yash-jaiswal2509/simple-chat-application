import { Copy, CopyCheckIcon, LoaderCircle, MessageCircleMoreIcon } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { useEffect, useRef, useState } from "react"
import { generateRandomCode } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

const CreateRoom = () => {
    const ws = useRef<WebSocket | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const wss = ws.current = new WebSocket("ws://localhost:8080/");
        wss.onopen = () => console.log("Connected to WebSocket server");

        wss.onmessage = (message) => {
            const data = JSON.parse(message.data);
            console.log(data);
        }


        return () => {
            wss?.close();
        }
    }, [navigate]);



    /* ------------------------------------- */

    const [roomCode, setRoomCode] = useState<string | undefined>();
    const [copyCode, setCopyCode] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleGenerateCode = async () => {
        setIsLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setRoomCode(generateRandomCode(8))
        } finally {
            setIsLoading(false);
        }
    }

    const handleCopy = async () => {
        await navigator.clipboard.writeText(roomCode as string);
        setCopyCode(true);
        setTimeout(() => setCopyCode(false), 2000);
    }

    return (
        <div className="bg-black text-white h-screen flex items-center justify-center p-2">
            <Card className="bg-black text-white font-mono xl:w-[40%]">
                <CardHeader>
                    <CardTitle className="text-3xl inline-flex items-center gap-2"><MessageCircleMoreIcon color="white" /> Real Time Chat</CardTitle>
                    <CardDescription className="text-lg">Chats vanishes when everyone exits!</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col items-center gap-4">
                    <Button variant={"secondary"} className="w-full" onClick={handleGenerateCode}>
                        {isLoading
                            ? <span className="inline-flex items-center gap-2">
                                <span><LoaderCircle className="animate-spin" /></span>
                                Generating...
                            </span>
                            : "Generate Room Code"}
                    </Button>
                    <div className="inline-flex w-full gap-2">
                        <Input placeholder="Enter Room Code" />
                        <Button variant={"secondary"}>Enter Room</Button>
                    </div>
                </CardContent>

                <CardFooter >
                    {roomCode && roomCode?.length > 0 && (
                        <div className="w-full bg-neutral-700 p-5 text-center rounded-md">
                            <h2 className="font-semibold sm:text-lg opacity-60">Share this code with your friend to chat!</h2>
                            <p className="font-bold text-xl sm:text-2xl mt-5 opacity-75 inline-flex items-center gap-3">
                                {isLoading ? "--------" : roomCode}
                                {!copyCode
                                    ? <Copy className="cursor-pointer" onClick={handleCopy} />
                                    : <CopyCheckIcon />
                                }
                            </p>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    )
}

export default CreateRoom