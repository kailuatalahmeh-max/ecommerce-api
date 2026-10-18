const Item = require("../../src/models/Item");

const addTestItem = async () => {
  const testItem = await Item.create({
    itemName: "test-item-1",
    itemPrice: 50,
    itemQuantity: 10,
    images: [
      {
        imageURL:
          "https://play-lh.googleusercontent.com/J_wlVPmqK0mX4htixme_jQaLyOLk8cJyeGHKccIVaSaGCwvL34A2Q3db7iEVAc4mQQ5tSmpNq_s2YuNcqe6D3A",
      },
      {
        imageURL:
          "https://play-lh.googleusercontent.com/J_wlVPmqK0mX4htixme_jQaLyOLk8cJyeGHKccIVaSaGCwvL34A2Q3db7iEVAc4mQQ5tSmpNq_s2YuNcqe6D3A",
      },
    ],
  });

  return { testItem };
};

module.exports = {
  addTestItem,
};
