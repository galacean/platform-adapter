interface PlatformAdapter {
  document;
  window;
  performance;
}

const platformAdapter: PlatformAdapter = {
  document: {},
  window: {},
  performance: {}
};

export default platformAdapter;
