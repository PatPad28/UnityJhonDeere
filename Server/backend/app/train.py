from sim_manager import SimManager
if __name__ == '__main__':
    m = SimManager()
    print('Starting training demo (10 episodes)')
    m.start_training(episodes=10, steps_per_episode=300)
    if m.train_thread:
        m.train_thread.join()
    print('Training finished, Q saved.')
