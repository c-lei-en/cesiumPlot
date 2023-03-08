import mitt from "mitt";

type Event = {
  drawEnd: any;
  modifiedEnd: any;
  seletedOne: any;
};

const emitter = mitt<Event>();
export default emitter;
