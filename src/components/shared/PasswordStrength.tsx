import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
    password: string;
}

interface Requirement {
    label: string;
    regex: RegExp;
}

const requirements: Requirement[] = [
    { label: "At least 8 characters", regex: /.{8,}/ },
    { label: "One uppercase letter", regex: /[A-Z]/ },
    { label: "One lowercase letter", regex: /[a-z]/ },
    { label: "One number", regex: /[0-9]/ },
    { label: "One special character", regex: /[!@#$%^&*(),.?":{}|<>]/ },
];

export function PasswordStrength({ password }: PasswordStrengthProps) {
    const { strength, passedRequirements } = useMemo(() => {
        const passed = requirements.filter((req) => req.regex.test(password));
        const strengthPercent = (passed.length / requirements.length) * 100;
        return { strength: strengthPercent, passedRequirements: passed.length };
    }, [password]);

    const getStrengthLabel = () => {
        if (passedRequirements === 0) return { label: "", color: "bg-gray-700" };
        if (passedRequirements <= 2) return { label: "Weak", color: "bg-red-500" };
        if (passedRequirements <= 3) return { label: "Fair", color: "bg-yellow-500" };
        if (passedRequirements <= 4) return { label: "Good", color: "bg-blue-500" };
        return { label: "Strong", color: "bg-green-500" };
    };

    const { label, color } = getStrengthLabel();

    if (!password) return null;

    return (
        <div className="space-y-3 mt-3">
            {/* Strength Bar */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Password strength</span>
                    <span className={cn(
                        "font-medium",
                        passedRequirements <= 2 && "text-red-400",
                        passedRequirements === 3 && "text-yellow-400",
                        passedRequirements === 4 && "text-blue-400",
                        passedRequirements === 5 && "text-green-400"
                    )}>
                        {label}
                    </span>
                </div>
                <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-300 rounded-full", color)}
                        style={{ width: `${strength}%` }}
                    />
                </div>
            </div>

            {/* Requirements List */}
            <div className="grid gap-1">
                {requirements.map((req) => {
                    const passed = req.regex.test(password);
                    return (
                        <div
                            key={req.label}
                            className={cn(
                                "flex items-center gap-2 text-xs transition-colors",
                                passed ? "text-green-400" : "text-gray-500"
                            )}
                        >
                            {passed ? (
                                <Check className="w-3.5 h-3.5" />
                            ) : (
                                <X className="w-3.5 h-3.5" />
                            )}
                            {req.label}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function getPasswordStrength(password: string): number {
    return requirements.filter((req) => req.regex.test(password)).length;
}

export function isPasswordStrong(password: string): boolean {
    return getPasswordStrength(password) >= 4;
}
