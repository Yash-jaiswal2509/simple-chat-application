import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateRandomCode } from "@/lib/utils";
import { Copy, CopyCheckIcon, LoaderCircle, MessageCircleMoreIcon, AlertTriangle } from "lucide-react";

const WebSocketURL = import.meta.env.VITE_WS_URL as string;

const CreateRoom = () => {
    const [roomCode, setRoomCode] = useState<string>("");
    const [copyCode, setCopyCode] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);
    const inputCode = useRef<HTMLInputElement | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const navigate = useNavigate();

    const connectWebSocket = () => {
        const wss = new WebSocket(WebSocketURL);
        ws.current = wss;

        wss.onopen = () => {
            setIsConnected(true);
            setError("");
            console.log("Connected to WebSocket server");
        };

        wss.onmessage = (message) => {
            const data = JSON.parse(message.data);
            switch (data.type) {
                case "roomCreated":
                    setIsLoading(false);
                    setRoomCode(data.roomCode);
                    break;
                case "error":
                    setError(data.message);
                    setIsLoading(false);
                    break;
                case "roomJoined":
                    navigate(`/chat/${inputCode.current?.value}`);
                    break;
            }
        };

        wss.onclose = () => {
            setIsConnected(false);
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        wss.onerror = () => {
            setError("Connection error. Attempting to reconnect...");
        };
    };

    useEffect(() => {
        connectWebSocket();
        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    const handleCreateRoom = async () => {
        setIsLoading(true);
        setError("");
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const newRoomCode = generateRandomCode(8);
            if (ws.current?.readyState === WebSocket.OPEN) {
                const roomObj = { type: "createRoom", roomCode: newRoomCode };
                ws.current.send(JSON.stringify(roomObj));
            } else {
                setError("Not connected to server. Please try again.");
                setIsLoading(false);
            }
        } catch (err) {
            setError("Failed to create room. Please try again.");
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);
            setCopyCode(true);
            setTimeout(() => setCopyCode(false), 2000);
        } catch (err) {
            setError("Failed to copy code. Please try manually.");
        }
    };

    const handleEnterRoom = async () => {
        const code = inputCode.current?.value.trim();
        setError("");

        if (!code) {
            setError("Please enter a room code");
            setIsLoading(false);
            return;
        }

        if (ws.current?.readyState === WebSocket.OPEN) {
            const roomObj = { type: "joinRoom", roomCode: code };
            ws.current.send(JSON.stringify(roomObj));
        } else {
            setError("Not connected to server. Please try again.");
        }
    };

    return (
        <div className="bg-black text-white h-screen flex items-center justify-center p-2">
            <Card className="bg-black text-white font-mono xl:w-[40%] w-full">
                <CardHeader>
                    <CardTitle className="text-3xl inline-flex items-center gap-2">
                        <MessageCircleMoreIcon color="white" /> Real Time Chat
                    </CardTitle>
                    <CardDescription className="text-lg">
                        Chats vanish when everyone exits!
                        {!isConnected && (
                            <span className="ml-2 text-yellow-500">(Reconnecting...)</span>
                        )}
                    </CardDescription>
                </CardHeader>

                {error && (
                    <CardContent className="pt-0">
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </CardContent>
                )}

                <CardContent className="flex flex-col items-center gap-4">
                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={handleCreateRoom}
                        disabled={isLoading || !isConnected}
                    >
                        {isLoading ? (
                            <span className="inline-flex items-center gap-2">
                                <LoaderCircle className="animate-spin" />
                                Generating...
                            </span>
                        ) : (
                            "Generate Room Code"
                        )}
                    </Button>
                    <div className="inline-flex w-full gap-2">
                        <Input
                            ref={inputCode}
                            placeholder="Enter Room Code"
                            disabled={!isConnected}
                            onKeyUp={(e) => e.key === "Enter" && handleEnterRoom()}
                        />
                        <Button
                            variant="secondary"
                            onClick={handleEnterRoom}
                            disabled={!isConnected}
                        >
                            Enter Room
                        </Button>
                    </div>
                </CardContent>

                <CardFooter>
                    {roomCode && (
                        <div className="w-full bg-neutral-700 p-5 text-center rounded-md">
                            <h2 className="font-semibold sm:text-lg opacity-60">
                                Share this code with your friend to chat!
                            </h2>
                            <p className="font-bold text-xl sm:text-2xl mt-5 opacity-75 inline-flex items-center justify-center gap-3">
                                {roomCode}
                                <button
                                    onClick={handleCopy}
                                    className="hover:opacity-80 transition-opacity"
                                    aria-label={copyCode ? "Copied!" : "Copy room code"}
                                >
                                    {copyCode ? <CopyCheckIcon /> : <Copy className="cursor-pointer" />}
                                </button>
                            </p>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default CreateRoom;