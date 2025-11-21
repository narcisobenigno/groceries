## Setup

I need to find a better way to set this up, but for now just add the following to your `.zshrc` or `.bashrc` to setup colima's docker socket:

```bash
ln -sf /Users/narciso/.colima/default/docker.sock $HOME/.docker/run/docker.sock
``````

