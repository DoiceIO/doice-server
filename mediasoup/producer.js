module.exports = {

  /**
   * Delete a producer
   * @param {string} producerId Producer Id 
   */
  async delete(producerId) {

    if (!producerId) {
      return {
        success: false,
        text: "Error deleting producer, no producer id provded"
      }
    }
    
    const producer = producers.get(producerId)
    if (!producer) {
      return {
        success: false,
        text: "Error deleting producer, no producer found"
      }
    }

    // Close the producer
    await producer.close()

    // Remove producer from global producers map
    producers.delete(producerId)

    return { success: true }
  }
}