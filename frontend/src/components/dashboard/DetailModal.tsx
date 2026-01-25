import { Modal } from "antd";
import { TableComponent } from "@/components/TailAdminReports";
import { ModalData } from "@/types/dashboard.types";

interface DetailModalProps {
  visible: boolean;
  data: ModalData | null;
  onClose: () => void;
}

export const DetailModal = ({ visible, data, onClose }: DetailModalProps) => {
  return (
    <Modal
      title={data?.title || ''}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 20 }}
    >
      {data && (
        <TableComponent
          title=""
          columns={data.columns}
          data={data.data}
        />
      )}
    </Modal>
  );
};
