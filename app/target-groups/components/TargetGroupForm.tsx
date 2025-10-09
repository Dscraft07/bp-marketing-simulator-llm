"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  targetGroupSchema,
  type TargetGroupFormData,
} from "@/lib/validation/targetGroupSchema";
import { createTargetGroup } from "@/app/target-groups/actions";
import { useState } from "react";

export function TargetGroupForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TargetGroupFormData>({
    resolver: zodResolver(targetGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      persona_count: 5,
    },
  });

  const onSubmit = async (data: TargetGroupFormData) => {
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("persona_count", data.persona_count.toString());

    const result = await createTargetGroup(formData);

    if (result.error) {
      console.error(result.error);
      // TODO: Show error toast
    } else {
      form.reset();
      // TODO: Show success toast and redirect
    }

    setIsSubmitting(false);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create New Target Group</CardTitle>
        <CardDescription>
          Define a target audience for your marketing campaign simulations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter target group name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the target audience characteristics, demographics, interests, etc."
                      rows={8}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide detailed characteristics to generate accurate personas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="persona_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Personas</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    How many personas to generate (1-100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Target Group"}
              </Button>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
