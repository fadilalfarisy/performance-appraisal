import { Table, Result, Button } from "antd";
import type { TableColumnsType } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import { TitlePage } from "@/components";
import { useGetCriteriaDetailsQuery } from "@/features/criteria/criteriaApi";

interface DataType {
  id: string;
  name: string;
  weight: number;
  description: string;
  type: string;
  version: number;
}

export const DetailsCriteria = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isSuccess, isError } = useGetCriteriaDetailsQuery(id);

  const columns: TableColumnsType<DataType> = [
    {
      title: "No",
      width: "1%",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Version",
      dataIndex: "version",
      width: "1%",
      render: (record) => `v${record}`,
    },
    {
      title: "Name",
      dataIndex: "name",
      width: "3%",
    },
    {
      title: "Description",
      dataIndex: "description",
      width: "5%",
    },
    {
      title: "Type",
      dataIndex: "type",
      width: "2%",
    },
    {
      title: "Weight",
      dataIndex: "weight",
      width: "1%",
      render: (record) => `${record}%`,
    },
  ];

  if (isError) {
    return (
      <Result
        status="error"
        title="403 Forbidden"
        subTitle="Oops, You can't access this page."
      />
    );
  }

  if (isSuccess) {
    console.log(data?.data);
    return (
      <>
        <TitlePage title="Criteria History" description="List of criteria versions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/dashboard/criteria/${id}/version/create`)}
          >
            Add Version
          </Button>
        </TitlePage>
        <Table<DataType>
          columns={columns}
          dataSource={data?.data}
          scroll={{ x: "max-content" }}
          rowKey="id"
          pagination={false}
        />
        <div style={{ display: "flex", justifyContent: "end", gap: 16, marginTop: "24px" }}>
          <Button
            type="default"
            onClick={() => navigate(-1)}
            icon={<ArrowLeftOutlined />}
          >
            Back
          </Button>
        </div>
      </>
    );
  }
};
