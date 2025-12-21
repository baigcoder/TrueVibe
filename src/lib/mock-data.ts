export type User = {
    id: string;
    name: string;
    handle: string;
    avatar: string;
    bio: string;
    verified: boolean;
    trustScore: number;
    followers: string;
    following: string;
};

export type Comment = {
    id: string;
    userId: string;
    content: string;
    timestamp: string;
    likes: number;
};

export type Post = {
    id: string;
    userId: string;
    content: string;
    image?: string;
    video?: string;
    timestamp: string;
    likes: number;
    comments: Comment[];
    shares: number;
    trustLevel: 'authentic' | 'suspicious' | 'fake';
};

export const MOCK_USERS: Record<string, User> = {
    "1": {
        id: "1",
        name: "Alex Rivera",
        handle: "@arivera",
        avatar: "https://i.pravatar.cc/150?u=1",
        bio: "Digital Artist & Tech Enthusiast. Building the future.",
        verified: true,
        trustScore: 98,
        followers: "12.5K",
        following: "450",
    },
    "2": {
        id: "2",
        name: "Sarah Chen",
        handle: "@schen_design",
        avatar: "https://i.pravatar.cc/150?u=2",
        bio: "UI/UX Designer. Lover of clean lines and bold colors.",
        verified: false,
        trustScore: 85,
        followers: "3.2K",
        following: "1.2K",
    },
    "3": {
        id: "3",
        name: "CryptoKing",
        handle: "@crypteking99",
        avatar: "https://i.pravatar.cc/150?u=3",
        bio: "To the moon! 🚀",
        verified: false,
        trustScore: 12,
        followers: "50K",
        following: "10K",
    },
};

export const CURRENT_USER = MOCK_USERS["1"];

export const MOCK_POSTS: Post[] = [
    {
        id: "101",
        userId: "2",
        content: "Just launched my new portfolio! Check it out and let me know what you think. #design #ux",
        image: "https://images.unsplash.com/photo-1545235617-9465d2a55698?w=800&auto=format&fit=crop&q=60",
        timestamp: "2 hours ago",
        likes: 342,
        comments: [
            { id: "c1", userId: "1", content: "Looks amazing Sarah! Love the typography.", timestamp: "1h", likes: 12 },
        ],
        shares: 45,
        trustLevel: "authentic",
    },
    {
        id: "102",
        userId: "1",
        content: "Working on a new AI project. The capabilities are mind-blowing. Here is a sneak peek.",
        timestamp: "4 hours ago",
        likes: 1205,
        comments: [],
        shares: 320,
        trustLevel: "authentic",
    },
    {
        id: "103",
        userId: "3",
        content: "URGENT: Click this link to claim your free Bitcoin! Limited time offer!",
        timestamp: "10 mins ago",
        likes: 56,
        comments: [],
        shares: 12,
        trustLevel: "fake",
    },
];
