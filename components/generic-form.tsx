// components/generic-form.tsx
"use client"

import { UseFormReturn, DefaultValues } from "react-hook-form"
import { z } from "zod"

import { Form } from "@/components/ui/form"

export function GenericForm<T extends z.ZodObject<any, any, any>>(
  props: {
    schema: T;
    defaultValues?: DefaultValues<z.infer<T>>;
    onSubmit: (values: z.infer<T>) => void;
    children: React.ReactNode;
    formId?: string;
    form: UseFormReturn<z.infer<T>>;
  }
) {
  return (
    <Form {...props.form}>
      <form onSubmit={props.form.handleSubmit(props.onSubmit)} className="space-y-4" id={props.formId}>
        {props.children}
      </form>
    </Form>
  )
}
