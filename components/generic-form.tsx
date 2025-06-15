"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, DefaultValues } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
} from "@/components/ui/form"

export function GenericForm<T extends z.ZodObject<any, any, any>>(
  props: {
    schema: T;
    defaultValues?: z.infer<T>;
    onSubmit: (values: z.infer<T>) => void;
    children: React.ReactNode;
    formId?: string;
  }
) {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(props.schema),
    defaultValues: props.defaultValues as DefaultValues<z.infer<T>>,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(props.onSubmit)} className="space-y-8" id={props.formId}>
        {props.children}
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
