export type DatabaseSchema = {
  sub_state: SubState;
};

export type SubState = {
  service: string;
  cursor: number;
};
