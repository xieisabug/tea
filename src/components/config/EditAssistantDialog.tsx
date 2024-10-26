import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AssistantDetail } from '../../data/Assistant';
import { toast } from 'sonner';

interface EditAssistantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentAssistant: AssistantDetail | null;
  onSave: (assistant: AssistantDetail) => Promise<void>;
  onAssistantUpdated: (updatedAssistant: AssistantDetail) => void;
}

const updateAssistantSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  description: z.string().optional(),
});

const EditAssistantDialog: React.FC<EditAssistantDialogProps> = ({
  isOpen,
  onClose,
  currentAssistant,
  onSave,
  onAssistantUpdated,
}) => {
  const form = useForm<z.infer<typeof updateAssistantSchema>>({
    resolver: zodResolver(updateAssistantSchema),
    defaultValues: {
      name: currentAssistant?.assistant.name || "",
      description: currentAssistant?.assistant.description || "",
    },
  });

  React.useEffect(() => {
    if (isOpen && currentAssistant) {
      form.reset({
        name: currentAssistant.assistant.name,
        description: currentAssistant.assistant.description || "",
      });
    }
  }, [isOpen, currentAssistant, form]);

  const handleSubmit = (values: z.infer<typeof updateAssistantSchema>) => {
    if (currentAssistant) {
      const updatedAssistant = {
        ...currentAssistant,
        assistant: {
          ...currentAssistant.assistant,
          name: values.name,
          description: values.description ?? null,
        },
      };
      onSave(updatedAssistant).then(() => {
        onAssistantUpdated(updatedAssistant);
        onClose();
        toast.success('修改助手名称与描述成功');
      }).catch((error) => {
        toast.error('修改助手名称与描述失败: ' + error);
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改助手 : {currentAssistant?.assistant.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='form-group-container'>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称:</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>描述:</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">确认</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAssistantDialog;
