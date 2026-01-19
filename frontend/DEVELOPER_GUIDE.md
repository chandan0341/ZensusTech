# Developer Guide - ZensusTech Frontend

## Overview
This guide provides patterns and standards for developing features in the ZensusTech frontend. Following these patterns ensures consistency, maintainability, and reduces token consumption.

## Table of Contents
1. [Component Patterns](#component-patterns)
2. [Form Patterns](#form-patterns)
3. [CRUD Operations](#crud-operations)
4. [Reusable Components](#reusable-components)
5. [Code Standards](#code-standards)

---

## Component Patterns

### 1. Reusable Form Fields

Always use the reusable form field components from `@/components/Common/FormFields`:

```tsx
import {
  FormTextField,
  FormPasswordField,
  FormCheckboxField,
  FormCustomField,
} from "@/components/Common/FormFields"

// Text input
<FormTextField
  name="email"
  label="Email"
  placeholder="Enter email"
  type="email"
  required
  form={form}
/>

// Password input (with show/hide toggle)
<FormPasswordField
  name="password"
  label="Password"
  placeholder="Enter password"
  required
  form={form}
/>

// Checkbox
<FormCheckboxField
  name="is_active"
  label="Is active?"
  form={form}
/>

// Custom field (for complex cases)
<FormCustomField
  name="custom"
  form={form}
  render={(field, form) => (
    // Your custom field implementation
  )}
/>
```

### 2. Form Dialogs Pattern

For Add/Edit operations, use this pattern:

```tsx
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useFormMutation } from "@/hooks/useFormMutation"
import { FormTextField } from "@/components/Common/FormFields"

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
})

type FormData = z.infer<typeof formSchema>

const AddEntity = () => {
  const [isOpen, setIsOpen] = useState(false)
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
    },
  })

  const mutation = useFormMutation({
    mutationFn: async (data: FormData) => {
      await EntityService.createEntity({ requestBody: data })
    },
    successMessage: "Entity created successfully",
    queryKey: ["entities"],
    form,
    onSuccessCallback: () => setIsOpen(false),
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add Entity</Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormTextField
                name="name"
                label="Name"
                required
                form={form}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                loading={mutation.isPending}
              >
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Form Patterns

### 1. Form Schema Definition

Always define schemas with Zod:

```tsx
import { z } from "zod"

const formSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  name: z.string().min(1, { message: "Name is required" }),
  age: z.number().min(18, { message: "Must be 18 or older" }),
})

// For password confirmation
const passwordSchema = z
  .object({
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "The passwords don't match",
    path: ["confirm_password"],
  })
```

### 2. Form Hook Setup

Always use this pattern:

```tsx
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  mode: "onBlur",
  criteriaMode: "all",
  defaultValues: {
    // Your default values
  },
})
```

### 3. Mutation Handling

Use the `useFormMutation` hook for all form mutations:

```tsx
import { useFormMutation } from "@/hooks/useFormMutation"

const mutation = useFormMutation({
  mutationFn: async (data: FormData) => {
    await Service.create({ requestBody: data })
  },
  successMessage: "Created successfully",
  queryKey: ["entities"], // For query invalidation
  form, // For auto-reset on success
  onSuccessCallback: () => {
    // Additional success handling
  },
})
```

---

## CRUD Operations

### 1. Create (Add) Operation

**Pattern:**
- Use `Dialog` with `DialogTrigger` button
- Use `useFormMutation` hook
- Use reusable `FormTextField`, `FormPasswordField`, etc.
- Show success toast
- Invalidate queries
- Reset form on success

**Example:** See `AddItem.tsx` or `AddUser.tsx`

### 2. Read (List) Operation

**Pattern:**
- Use `useQuery` from `@tanstack/react-query`
- Use `DataTable` component for tables
- Handle loading and error states

```tsx
import { useQuery } from "@tanstack/react-query"

const { data, isLoading, error } = useQuery({
  queryKey: ["entities"],
  queryFn: () => EntityService.getEntities(),
})
```

### 3. Update (Edit) Operation

**Pattern:**
- Use `Dialog` triggered from `DropdownMenuItem` in actions menu
- Pre-populate form with existing data
- Use `useFormMutation` hook
- Handle optional fields (e.g., password)

**Example:** See `EditItem.tsx` or `EditUser.tsx`

### 4. Delete Operation

**Pattern:**
- Use `DeleteDialog` component
- Trigger from `DropdownMenuItem` in actions menu

```tsx
import { DeleteDialog } from "@/components/Common/DeleteDialog"
import { Trash2 } from "lucide-react"

<DeleteDialog
  id={entity.id}
  title="Delete Entity"
  description="This will permanently delete the entity. Are you sure?"
  onDelete={async (id) => {
    await EntityService.deleteEntity({ id })
  }}
  queryKey={["entities"]}
  trigger={<><Trash2 /> Delete Entity</>}
/>
```

### 5. Actions Menu

**Pattern:**
- Use `ActionsMenu` component
- Include Edit and Delete actions

```tsx
import { ActionsMenu } from "@/components/Common/ActionsMenu"

<ActionsMenu>
  <EditEntity entity={entity} onSuccess={() => {}} />
  <DeleteEntity id={entity.id} onSuccess={() => {}} />
</ActionsMenu>
```

---

## Reusable Components

### Available Reusable Components

1. **FormFields** (`@/components/Common/FormFields`)
   - `FormTextField` - Text, email, number inputs
   - `FormPasswordField` - Password with show/hide toggle
   - `FormCheckboxField` - Checkbox inputs
   - `FormCustomField` - Custom field renderer

2. **Dialogs** (`@/components/Common`)
   - `DeleteDialog` - Delete confirmation dialog
   - `FormDialog` - Generic form dialog (advanced use)

3. **Menus** (`@/components/Common`)
   - `ActionsMenu` - Dropdown menu for actions

4. **Hooks** (`@/hooks`)
   - `useFormMutation` - Form mutation with auto error handling, toast, query invalidation

---

## Code Standards

### 1. File Naming
- Components: `PascalCase.tsx` (e.g., `AddUser.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useFormMutation.ts`)
- Utils: `camelCase.ts` (e.g., `handleError.ts`)

### 2. Component Structure

```tsx
// 1. Imports (grouped)
import { external } from "external-lib"
import { internal } from "@/components/..."

// 2. Types/Schemas
const formSchema = z.object({...})
type FormData = z.infer<typeof formSchema>

// 3. Component
const Component = () => {
  // Hooks
  const [state, setState] = useState()
  const form = useForm()
  
  // Handlers
  const handleSubmit = () => {}
  
  // Render
  return <div>...</div>
}

export default Component
```

### 3. TypeScript
- Always type function parameters and return types
- Use `z.infer<typeof schema>` for form data types
- Avoid `any` - use proper types or `unknown`

### 4. Error Handling
- Use `handleError` utility for consistent error handling
- Always show user-friendly error messages via toast

### 5. Query Management
- Always invalidate queries after mutations
- Use consistent query keys: `["entities"]`, `["users"]`, etc.

### 6. Accessibility
- Use semantic HTML
- Include `aria-label` for icon buttons
- Ensure keyboard navigation works

---

## Best Practices

### ✅ DO

- Use reusable components (`FormTextField`, `DeleteDialog`, etc.)
- Use `useFormMutation` for all form submissions
- Define Zod schemas for validation
- Invalidate queries after mutations
- Show success/error toasts
- Reset forms on success
- Use consistent naming conventions
- Type everything properly

### ❌ DON'T

- Don't create custom form fields when reusable ones exist
- Don't handle mutations manually - use `useFormMutation`
- Don't forget to invalidate queries
- Don't use inline styles (use Tailwind classes)
- Don't use `any` type
- Don't duplicate code - extract to reusable components
- Don't forget error handling

---

## Examples

### Complete Add Component Example

See `frontend/src/components/Items/AddItem.tsx` for a complete example.

### Complete Edit Component Example

See `frontend/src/components/Items/EditItem.tsx` for a complete example.

### Complete Delete Component Example

See `frontend/src/components/Items/DeleteItem.tsx` for a complete example.

---

## Quick Reference

### Creating a New CRUD Feature

1. **Create Schema:**
   ```tsx
   const formSchema = z.object({...})
   ```

2. **Create Add Component:**
   - Use `Dialog` + `FormTextField` + `useFormMutation`

3. **Create Edit Component:**
   - Use `Dialog` + `FormTextField` + `useFormMutation` + pre-populate

4. **Create Delete Component:**
   - Use `DeleteDialog`

5. **Create Actions Menu:**
   - Use `ActionsMenu` + Edit + Delete components

6. **Add to List Page:**
   - Use `DataTable` with actions column

---

## Questions?

If you're unsure about a pattern, check existing components:
- `AddItem.tsx` / `EditItem.tsx` / `DeleteItem.tsx`
- `AddUser.tsx` / `EditUser.tsx` / `DeleteUser.tsx`

These follow all the patterns described in this guide.
