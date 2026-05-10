"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

const Schema = z.object({
  full_name: z.string().min(2, "Required"),
  phone: z
    .string()
    .min(10, "10-digit phone number")
    .max(15, "Too long")
    .regex(/^[+0-9 -]+$/, "Digits, spaces, + and - only"),
});

type Values = z.infer<typeof Schema>;

export function ProfileForm({
  email,
  fullName,
  phone,
}: {
  email: string;
  fullName: string;
  phone: string;
}) {
  const [pending, start] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { full_name: fullName, phone },
  });

  function onSubmit(values: Values) {
    start(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update(values)
        .eq("id", user.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Profile updated");
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <Input value={email} disabled className="mt-1.5" />
          <p className="mt-1 text-xs text-muted-foreground">
            Contact support to change your email.
          </p>
        </div>
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input
                  inputMode="tel"
                  placeholder="+91 ..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
    </Form>
  );
}
