import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateRandomCode } from "@/lib/utils";
import { MessageCircleMoreIcon, AlertTriangle } from "lucide-react";

const WebSocketURL = import.meta.env.VITE_WS_URL as string;

const CreateRoom = () => {
    const [isLoading, setIsLoading] = useState(false);
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
                    navigate(`/chat/${data.roomCode}`, {
                        state: { roomCode: data.roomCode, userId: data.userId },
                    });
                    break;
                case "error":
                    setError(data.message);
                    setIsLoading(false);
                    break;
                case "roomJoined":
                    navigate(`/chat/${data.roomCode}`, {
                        state: { roomCode: data.roomCode, userId: data.userId },
                    });
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
        // Only connect if we're not navigating away
        if (!isLoading) {
            connectWebSocket();
        }
        
        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [navigate, isLoading]);

    const handleCreateRoom = () => {
        setIsLoading(true);
        setError("");
        if (ws.current?.readyState === WebSocket.OPEN) {
            const newRoomCode = generateRandomCode(8);
            ws.current.send(JSON.stringify({ type: "createRoom", roomCode: newRoomCode }));
        } else {
            setError("Not connected to server. Please try again.");
        }
        setIsLoading(false);
    };

    const handleEnterRoom = () => {
        const code = inputCode.current?.value.trim();
        setError("");

        if (!code) {
            setError("Please enter a room code");
            return;
        }

        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: "joinRoom", roomCode: code }));
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
                    <CardContent>
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
                        {isLoading ? "Generating..." : "Create Room"}
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
                            Join Room
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateRoom;
