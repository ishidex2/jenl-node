//Simple rectangle program

def buffer = ``;
def width = 10;
def height = 10;


~repeat 10 as idx
  buffer += idx;
~quit

print(`Let's draw a rectangle`);
~repeat 10 as idx
  print(buffer);
~quit

def formatted = ` (`;

~repeat 10 as a
  ~repeat 20 as b
    printn(`.`);
    printn(b);
  ~quit
  formatted += a;
  formatted += `)`;
  print(formatted);
  formatted = ` (`;
~quit
print(`Done`);

