export enum Opcode {
  NPUSHB = 0x40,
  NPUSHW = 0x41,

  PUSHB0 = 0xb0,
  PUSHB1 = 0xb1,
  PUSHB2 = 0xb2,
  PUSHB3 = 0xb3,
  PUSHB4 = 0xb4,
  PUSHB5 = 0xb5,
  PUSHB6 = 0xb6,
  PUSHB7 = 0xb7,

  PUSHW0 = 0xb8,
  PUSHW1 = 0xb9,
  PUSHW2 = 0xba,
  PUSHW3 = 0xbb,
  PUSHW4 = 0xbc,
  PUSHW5 = 0xbd,
  PUSHW6 = 0xbe,
  PUSHW7 = 0xbf,

  RS = 0x43,
  WS = 0x42,

  WCVTP = 0x44,
  WCVTF = 0x70,

  RCVT = 0x45,

  SVTCA0 = 0x00,
  SVTCA1 = 0x01,

  SPVTCA0 = 0x02,
  SPVTCA1 = 0x03,

  SFVTCA0 = 0x04,
  SFVTCA1 = 0x05,

  SPVTL0 = 0x06,
  SPVTL1 = 0x07,

  SFVTL0 = 0x08,
  SFVTL1 = 0x09,

  SFVTPV = 0x0e,

  SDPVTL0 = 0x86,
  SDPVTL1 = 0x87,

  SPVFS = 0x0a,
  SFVFS = 0x0b,

  GPV = 0x0c,
  GFV = 0x0d,

  SRP0 = 0x10,
  SRP1 = 0x11,
  SRP2 = 0x12,

  SZP0 = 0x13,
  SZP1 = 0x14,
  SZP2 = 0x15,
  SZPS = 0x16,

  RTHG = 0x19,
  RTG = 0x18,
  RTDG = 0x3d,
  RDTG = 0x7d,
  RUTG = 0x7c,
  ROFF = 0x7a,

  SROUND = 0x76,
  S45ROUND = 0x77,

  SLOOP = 0x17,
  SMD = 0x1a,

  INSTCTRL = 0x8e,
  SCANCTRL = 0x85,
  SCANTYPE = 0x8d,
  SCVTCI = 0x1d,
  SSWCI = 0x1e,
  SSW = 0x1f,
  FLIPON = 0x4d,
  FLIPOFF = 0x4e,

  /** @deprecated no longer used? */
  SANGW = 0x7e,

  SDB = 0x5e,
  SDS = 0x5f,

  GC0 = 0x46,
  GC1 = 0x47,
  SCFS = 0x48,

  MD0 = 0x49,
  MD1 = 0x4a,

  MPPEM = 0x4b,
  MPS = 0x4c,

  // Point operations

  FLIPPT = 0x80,
  FLIPRGON = 0x81,
  FLIPRGOFF = 0x82,
  SHP0 = 0x32,
  SHP1 = 0x33,
  SHC0 = 0x34,
  SHC1 = 0x35,
  SHZ0 = 0x36,
  SHZ1 = 0x37,
  SHPIX = 0x38,
  MSIRP0 = 0x3a,
  MSIRP1 = 0x3b,
  MDAP0 = 0x2e,
  MDAP1 = 0x2f,
  MIAP0 = 0x3e,
  MIAP1 = 0x3f,

  // TODO: is there a better way to do this than to explicitly list these out
  MDRP00 = 0xc0,
  MDRP01 = 0xc1,
  MDRP02 = 0xc2,
  MDRP03 = 0xc3,
  MDRP04 = 0xc4,
  MDRP05 = 0xc5,
  MDRP06 = 0xc6,
  MDRP07 = 0xc7,
  MDRP08 = 0xc8,
  MDRP09 = 0xc9,
  MDRP0A = 0xca,
  MDRP0B = 0xcb,
  MDRP0C = 0xcc,
  MDRP0D = 0xcd,
  MDRP0E = 0xce,
  MDRP0F = 0xcf,
  MDRP10 = 0xd0,
  MDRP11 = 0xd1,
  MDRP12 = 0xd2,
  MDRP13 = 0xd3,
  MDRP14 = 0xd4,
  MDRP15 = 0xd5,
  MDRP16 = 0xd6,
  MDRP17 = 0xd7,
  MDRP18 = 0xd8,
  MDRP19 = 0xd9,
  MDRP1A = 0xda,
  MDRP1B = 0xdb,
  MDRP1C = 0xdc,
  MDRP1D = 0xdd,
  MDRP1E = 0xde,
  MDRP1F = 0xdf,

  MIRP00 = 0xe0,
  MIRP01 = 0xe1,
  MIRP02 = 0xe2,
  MIRP03 = 0xe3,
  MIRP04 = 0xe4,
  MIRP05 = 0xe5,
  MIRP06 = 0xe6,
  MIRP07 = 0xe7,
  MIRP08 = 0xe8,
  MIRP09 = 0xe9,
  MIRP0A = 0xea,
  MIRP0B = 0xeb,
  MIRP0C = 0xec,
  MIRP0D = 0xed,
  MIRP0E = 0xee,
  MIRP0F = 0xef,
  MIRP10 = 0xf0,
  MIRP11 = 0xf1,
  MIRP12 = 0xf2,
  MIRP13 = 0xf3,
  MIRP14 = 0xf4,
  MIRP15 = 0xf5,
  MIRP16 = 0xf6,
  MIRP17 = 0xf7,
  MIRP18 = 0xf8,
  MIRP19 = 0xf9,
  MIRP1A = 0xfa,
  MIRP1B = 0xfb,
  MIRP1C = 0xfc,
  MIRP1D = 0xfd,
  MIRP1E = 0xfe,
  MIRP1F = 0xff,

  ALIGNRP = 0x3c,

  /** @deprecated (adjust angle) */
  AA = 0x7f,

  ISECT = 0x0f,
  ALIGNPTS = 0x27,
  IP = 0x39,
  UTP = 0x29,
  IUP0 = 0x30,
  IUP1 = 0x31,

  // Managing exceptions

  DELTAP1 = 0x5d,
  DELTAP2 = 0x71,
  DELTAP3 = 0x72,
  DELTAC1 = 0x73,
  DELTAC2 = 0x74,
  DELTAC3 = 0x75,

  // Managing the stack

  DUP = 0x20,
  POP = 0x21,
  CLEAR = 0x22,
  SWAP = 0x23,
  DEPTH = 0x24,
  CINDEX = 0x25,
  MINDEX = 0x26,
  ROLL = 0x8a,

  // Control flow

  IF = 0x58,
  ELSE = 0x1b,
  EIF = 0x59,

  JROT = 0x78,
  JMPR = 0x1c,
  JROF = 0x79,

  // Logical operations

  LT = 0x50,
  LTEQ = 0x51,
  GT = 0x52,
  GTEQ = 0x53,
  EQ = 0x54,
  NEQ = 0x55,
  ODD = 0x56,
  EVEN = 0x57,
  AND = 0x5a,
  OR = 0x5b,
  NOT = 0x5c,

  // Arithmetic operations

  ADD = 0x60,
  SUB = 0x61,
  DIV = 0x62,
  MUL = 0x63,
  ABS = 0x64,
  NEG = 0x65,
  FLOOR = 0x66,
  CEILING = 0x67,
  MAX = 0x8b,
  MIN = 0x8c,

  ROUND0 = 0x68,
  ROUND1 = 0x69,
  ROUND2 = 0x6a,
  ROUND3 = 0x6b,

  NROUND0 = 0x6c,
  NROUND1 = 0x6d,
  NROUND2 = 0x6e,
  NROUND3 = 0x6f,

  // Functions

  LOOPCALL = 0x2a,
  CALL = 0x2b,
  FDEF = 0x2c,
  ENDF = 0x2d,
  IDEF = 0x89,

  // Debug

  DEBUG = 0x4f,

  // Misc

  GETINFO = 0x88,
  GETVARIATION = 0x91,
}
