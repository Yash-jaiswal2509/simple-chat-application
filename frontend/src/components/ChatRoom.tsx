import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircleMoreIcon, SendIcon, Users, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime } from "@/lib/utils";

type Message = {
    user: string;
    message: string;
    time: string;
};

const ChatRoom = () => {
    const { roomCode } = useParams<{ roomCode: string }>();
    const navigate = useNavigate();
    const ws = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState<string>("");
    const [isConnected, setIsConnected] = useState(false);
    const [usersOnline, setUsersOnline] = useState(0);
    const [error, setError] = useState<string>("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const connectWebSocket = () => {
        const wss = new WebSocket("ws://localhost:8080/");
        ws.current = wss;

        wss.onopen = () => {
            setIsConnected(true);
            setError("");
            console.log("Connected to WebSocket server");
            wss.send(JSON.stringify({ type: "joinRoom", roomCode }));
        };

        wss.onmessage = (messageEvent) => {
            const data = JSON.parse(messageEvent.data);
            switch (data.type) {
                case "message":
                    setMessages((prevMessages) => [...prevMessages, { user: data.userId, message: data.message, time: data.time }]);
                    break;
                case "userJoined":
                    setUsersOnline((prev) => prev + 1);
                    break;
                case "userLeft":
                    setUsersOnline((prev) => Math.max(0, prev - 1));
                    break;
                case "roomJoined":
                    setMessages(data.messages);
                    setUsersOnline(data.usersOnline);
                    break;
                case "error":
                    setError(data.message);
                    if (data.message === "Room does not exist.") {
                        setTimeout(() => navigate("/"), 3000);
                    }
                    break;
            }
        };

        wss.onclose = () => {
            setIsConnected(false);
            // Attempt to reconnect after 3 seconds
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };

        wss.onerror = () => {
            setError("Connection error. Attempting to reconnect...");
        };

        return () => {
            wss.close();
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
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
    }, [roomCode]);

    const handleSendMessage = () => {
        if (inputMessage.trim() && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: "message", roomCode, message: inputMessage.trim() }));
            setInputMessage("");
        }
    };


    return (
        <div className="bg-black text-white h-screen flex items-center justify-center p-2">
            <Card className="bg-black text-white font-mono xl:w-[40%] w-full">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-3xl inline-flex items-center gap-2">
                            <MessageCircleMoreIcon color="white" /> Real Time Chat
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                            <Users size={20} />
                            <span>{usersOnline - 1}</span>
                        </div>
                    </div>
                    <CardDescription className="text-lg">
                        Room Code: {roomCode}
                        {!isConnected && (
                            <span className="ml-2 text-yellow-500">(Reconnecting...)</span>
                        )}
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col items-stretch gap-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <ScrollArea className="h-[400px] rounded-lg border bg-neutral-700 p-4">
                        {messages.map((msg, index) => (
                            <>
                                <div key={index} className="flex w-full justify-between mb-4 last:mb-0">
                                    <p className="text-base break-words">{msg.message}</p>
                                    <span className="text-[10px] text-gray-400">
                                        {formatTime(new Date(msg.time))}
                                    </span>
                                </div>
                            </>
                        ))}
                        <div ref={messagesEndRef} />
                    </ScrollArea>
                </CardContent>

                <CardFooter className="w-full gap-2">
                    <Input
                        placeholder="Message..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyUp={(e) => e.key === "Enter" && handleSendMessage()}
                        disabled={!isConnected}
                        className="flex-1"
                    />
                    <Button
                        className="flex items-center gap-2"
                        onClick={handleSendMessage}
                        disabled={!isConnected || !inputMessage.trim()}
                    >
                        Send <SendIcon size={18} />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ChatRoom;