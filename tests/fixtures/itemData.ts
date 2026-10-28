const validItemData = {
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
};

const emptyImagesData = {
  itemName: "test-item-2",
  itemPrice: 50,
  itemQuantity: 10,
  images: [],
};

const invalidItemDataJavaScriptImageURL = {
  itemName: "test-item-4",
  itemPrice: 50,
  itemQuantity: 10,
  images: [
    {
      imageURL: "javascript:alert(1)",
    },
  ],
};

const invalidItemDataNegativePrice = {
  itemName: "test-item-3",
  itemPrice: -50,
  itemQuantity: 10,
  images: [
    {
      imageURL:
        "https://play-lh.googleusercontent.com/J_wlVPmqK0mX4htixme_jQaLyOLk8cJyeGHKccIVaSaGCwvL34A2Q3db7iEVAc4mQQ5tSmpNq_s2YuNcqe6D3A",
    },
  ],
};

const validEditedItemData = {
  itemName: "test-item-1-edited",
  itemPrice: 75,
  itemQuantity: 15,
  images: [
    {
      imageURL:
        "https://play-lh.googleusercontent.com/J_wlVPmqK0mX4htixme_jQaLyOLk8cJyeGHKccIVaSaGCwvL34A2Q3db7iEVAc4mQQ5tSmpNq_s2YuNcqe6D3A",
    },
  ],
};

export {
  validItemData,
  emptyImagesData,
  invalidItemDataNegativePrice,
  validEditedItemData,
  invalidItemDataJavaScriptImageURL,
};
