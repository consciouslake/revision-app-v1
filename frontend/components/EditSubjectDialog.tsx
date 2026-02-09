"use client";

import { useEffect, useState } from "react";
import { updateSubject } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface EditSubjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subject: any;
    onSuccess: () => void;
}

export function EditSubjectDialog({ open, onOpenChange, subject, onSuccess }: EditSubjectDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (subject) {
            setName(subject.name);
            setDescription(subject.description || "");
        }
    }, [subject]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject) return;

        setLoading(true);
        try {
            await updateSubject(subject.id, { name, description });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            alert("Failed to update subject");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Subject</DialogTitle>
                    <DialogDescription>
                        Make changes to your subject here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter a brief description..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
