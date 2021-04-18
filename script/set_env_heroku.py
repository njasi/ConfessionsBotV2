import os
import sys
import re

ENV_MODES = {
    "dev": ".env_test",
    "dep": ".env_deploy"
}


def main(mode):
    file = open(ENV_MODES[mode])
    lines = filter(lambda line: re.search("^[^#.*]",line) and not line.isspace(),file.readlines())
    command = "heroku config:set"
    for line in lines:
      command += " {}".format(line.strip())
    print(command)
    # os.system(command)


if __name__ == "__main__":
    if(len(sys.argv) < 2 or sys.argv[1] not in ENV_MODES):
        print("Usage: set_env_heroku.py mode \n\tmode: {}".format("|".join(ENV_MODES)))
    else:
        main(sys.argv[1])