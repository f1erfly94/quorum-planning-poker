import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {isValidRoomId} from "@protocol";
import {RoomClient} from "@/components/RoomClient";

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
    const {id} = await params;
    return {
        title: `Room ${id}`,
        // A room is a live conversation, not a page for a search engine.
        robots: {index: false, follow: false},
    };
}

export default async function RoomPage({params}: {params: Promise<{id: string}>}) {
    const {id} = await params;
    const roomId = id.toLowerCase();
    if (!isValidRoomId(roomId)) notFound();

    return <RoomClient roomId={roomId} />;
}
