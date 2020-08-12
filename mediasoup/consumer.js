const Trasport = require("./transport")

const eventsList = []

module.exports = {

  // Delete a consume
  async delete(consumerId) {
  
    // Close the consumer
    const consumer = consumers.get(consumerId)
    await consumer.close()

    // Remove consumer from global consumers map
    consumers.delete(consumerId)
  }
}